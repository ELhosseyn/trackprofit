import prisma from "../db.server";

export class ZRExpressService {
  constructor() {
    this.baseUrl = 'https://procolis.com/api_v1';
    this.prisma = prisma;
  }

  async validateCredentials(token, key) {
    try {

      // Input validation
      if (!token || typeof token !== 'string' || token.trim().length === 0) {
        throw new Error('رمز الوصول مطلوب');
      }
      if (!key || typeof key !== 'string' || key.trim().length === 0) {
        throw new Error('مفتاح الوصول مطلوب');
      }

      // Test the connection with ZRExpress using the tarification endpoint
      const response = await fetch(`${this.baseUrl}/tarification`, {
        method: 'POST',
        headers: {
          'Accept': 'application/json',
          'Content-Type': 'application/json',
          'token': token.trim(),
          'key': key.trim()
        },
        body: JSON.stringify({})
      });

      if (!response.ok) {
        const errorText = await response.text();
        console.error('Validation error response:', errorText);
        try {
          const errorJson = JSON.parse(errorText);
          if (errorJson.fault) {
            throw new Error(errorJson.fault.faultstring || 'بيانات الاعتماد غير صالحة');
          }
          throw new Error(JSON.stringify(errorJson) || 'بيانات الاعتماد غير صالحة');
        } catch (e) {
          throw new Error(errorText || 'بيانات الاعتماد غير صالحة');
        }
      }

      // Try to parse the response to ensure it's valid
      const data = await response.json();

      if (!Array.isArray(data)) {
        throw new Error('استجابة غير صالحة من الخادم');
      }

      return { success: true };
    } catch (error) {
      console.error('ZRExpress validation error:', error);
      return { success: false, error: error.message || 'حدث خطأ أثناء التحقق من بيانات الاعتماد' };
    }
  }

  async addColis(token, key, colisData, session) {
    try {
      if (!token || !key) {
        throw new Error('بيانات الاعتماد مطلوبة');
      }

      if (!session || !session.shop) {
        throw new Error('Shop information is required');
      }

      // Ensure the data matches the API format exactly
      const formattedData = {
        Colis: [{
          Tracking: this.generateTracking(),
          TypeLivraison: String(colisData.TypeLivraison || "0"),
          TypeColis: String(colisData.TypeColis || "0"),
          Confrimee: colisData.Confrimee || "1", // Default to confirmed (1) if not provided
          Client: colisData.Client || "",
          MobileA: colisData.MobileA || "",
          MobileB: colisData.MobileB || "",
          Adresse: colisData.Adresse || "",
          IDWilaya: String(colisData.IDWilaya || "31"),
          Commune: colisData.Commune || "",
          Total: String(colisData.Total || "0"),
          Note: colisData.Note || "",
          TProduit: colisData.TProduit || "",
          id_Externe: this.generateExternalId(),
          Source: colisData.Source || "Shopify"
        }]
      };

      const response = await fetch(`${this.baseUrl}/add_colis`, {
        method: 'POST',
        headers: {
          'Accept': 'application/json',
          'Content-Type': 'application/json',
          'token': token.trim(),
          'key': key.trim()
        },
        body: JSON.stringify(formattedData)
      });

      const responseText = await response.text();

      if (!response.ok) {
        try {
          const errorJson = JSON.parse(responseText);
          if (errorJson.fault) {
            throw new Error(errorJson.fault.faultstring || 'فشل في إضافة الشحنة');
          }
        } catch (e) {
          throw new Error('فشل في إضافة الشحنة');
        }
      }

      try {
        const result = JSON.parse(responseText);
        
        // Get wilaya name based on ID
        let wilayaName = colisData.Wilaya || ""; // Use provided Wilaya name if available
        
        // If no wilaya name was provided, try to fetch it from tarification data
        if (!wilayaName) {
          try {
            // Fetch the wilaya name from the tarification data
            const tarificationData = await this.getTarification(token, key);
            const wilayaInfo = tarificationData.find(item => item.IDWilaya.toString() === formattedData.Colis[0].IDWilaya);
            if (wilayaInfo) {
              wilayaName = wilayaInfo.Wilaya;

            } else {

            }
          } catch (error) {
            console.error('Error fetching wilaya name:', error);
          }
        } else {

        }

        // Prepare shipment data for database
        const shipmentData = {
          shop: session.shop,
          tracking: formattedData.Colis[0].Tracking,
          client: formattedData.Colis[0].Client,
          mobileA: formattedData.Colis[0].MobileA,
          mobileB: formattedData.Colis[0].MobileB,
          address: formattedData.Colis[0].Adresse,
          wilayaId: parseInt(formattedData.Colis[0].IDWilaya) || 31,
          wilaya: wilayaName, // Set the wilaya name we just fetched
          commune: formattedData.Colis[0].Commune,
          total: parseFloat(formattedData.Colis[0].Total) || 0,
          note: formattedData.Colis[0].Note,
          productType: (formattedData.Colis[0].TProduit || '').split(' - ')[0] || 'N/A', // Safe split with fallback
          deliveryType: parseInt(formattedData.Colis[0].TypeLivraison) || 0,
          packageType: parseInt(formattedData.Colis[0].TypeColis) || 0,
          status: "En Préparation",
          statusId: 1,
          externalId: formattedData.Colis[0].id_Externe,
          createdAt: new Date(),
          updatedAt: new Date()
        };

        // Debug logging to check field values
        console.log('ZRExpress service - shipmentData before save:', {
          deliveryType: shipmentData.deliveryType,
          packageType: shipmentData.packageType,
          TypeLivraison: formattedData.Colis[0].TypeLivraison,
          TypeColis: formattedData.Colis[0].TypeColis
        });
        
        
        // Include orderId if provided
        if (colisData.orderId) {
          shipmentData.orderId = colisData.orderId;

        }
        
        // Include cost information if provided

        // Default to 0 if values are not provided or parsing fails
        try {
          shipmentData.totalCost = colisData.totalCost ? parseFloat(colisData.totalCost) : 0;

        } catch (error) {
          console.error('Error parsing totalCost:', error);
          shipmentData.totalCost = 0;
        }
        
        try {
          shipmentData.totalRevenue = colisData.totalRevenue ? parseFloat(colisData.totalRevenue) : 0;

        } catch (error) {
          console.error('Error parsing totalRevenue:', error);
          shipmentData.totalRevenue = 0;
        }
        
        try {
          shipmentData.profit = colisData.totalProfit ? parseFloat(colisData.totalProfit) : 0;

        } catch (error) {
          console.error('Error parsing totalProfit:', error);
          shipmentData.profit = 0;
        }

        // Add delivery fee and cancel fee
        try {
          shipmentData.deliveryFee = colisData.deliveryFee ? parseFloat(colisData.deliveryFee) : 0;

        } catch (error) {
          console.error('Error parsing deliveryFee:', error);
          shipmentData.deliveryFee = 0;
        }
        
        try {
          shipmentData.cancelFee = colisData.cancelFee ? parseFloat(colisData.cancelFee) : 0;

        } catch (error) {
          console.error('Error parsing cancelFee:', error);
          shipmentData.cancelFee = 0;
        }
        
        // Save the shipment to the database
        // Validate that all required fields are present
        const requiredFields = ['deliveryType', 'packageType', 'wilayaId', 'total'];
        const missingFields = requiredFields.filter(field => shipmentData[field] === undefined || shipmentData[field] === null);
        
        if (missingFields.length > 0) {
          console.error('Missing required fields in shipmentData:', missingFields, shipmentData);
          throw new Error(`Missing required fields: ${missingFields.join(', ')}`);
        }
        
        const savedShipment = await this.prisma.Shipment.create({
          data: shipmentData
        });

        return { success: true, data: result, shipment: savedShipment };
      } catch (e) {
        console.error('Failed to process or save shipment:', e);
        return { success: false, error: `Failed to process or save shipment: ${e.message}` };
      }
    } catch (error) {
      console.error('Add colis error:', error);
      return { success: false, error: error.message || 'An unknown error occurred' };
    }
  }

  async getShipmentStatuses(token, key, trackingNumbers = [], shop, trackingDates = new Map(), dateRange = null) {
    try {
      if (!token || !key) {
        throw new Error('بيانات الاعتماد مطلوبة');
      }

      if (!shop) {
        throw new Error('Shop information is required');
      }

      if (process.env.NODE_ENV !== 'production') {


      }

      // First, get all shipments from database if no tracking numbers provided
      let dbShipments = [];
      if (trackingNumbers.length === 0) {
        // Build the where clause with date range if provided
        const whereClause = {
          shop,
          ...(dateRange && dateRange.start && dateRange.end ? {
            updatedAt: {
              gte: new Date(dateRange.start),
              lte: new Date(dateRange.end)
            }
          } : {})
        };

        dbShipments = await this.prisma.Shipment.findMany({
          where: whereClause,
          orderBy: { updatedAt: 'desc' }
        });
        
        if (dbShipments.length === 0) {
          return [];
        }
        
        trackingNumbers = dbShipments.map(s => s.tracking);
      } else {
        // Get existing shipments for the provided tracking numbers
        // with date range filter if provided
        const whereClause = {
          tracking: {
            in: trackingNumbers
          },
          shop,
          ...(dateRange && dateRange.start && dateRange.end ? {
            updatedAt: {
              gte: new Date(dateRange.start),
              lte: new Date(dateRange.end)
            }
          } : {})
        };

        if (process.env.NODE_ENV !== 'production') {

        }

        dbShipments = await this.prisma.Shipment.findMany({
          where: whereClause,
          orderBy: { updatedAt: 'desc' }
        });
      }

      // Prepare the request body according to the API format
      const requestBody = {
        Colis: trackingNumbers.map(tracking => ({ Tracking: tracking }))
      };

      if (process.env.NODE_ENV !== 'production') {

      }

      // Make the API call to get statuses
      const response = await fetch(`${this.baseUrl}/lire`, {
        method: 'POST',
        headers: {
          'Accept': 'application/json',
          'Content-Type': 'application/json',
          'token': token.trim(),
          'key': key.trim()
        },
        body: JSON.stringify(requestBody)
      });

      if (!response.ok) {
        const errorText = await response.text();
        console.error('Status check error response:', errorText);
        try {
          const errorJson = JSON.parse(errorText);
          if (errorJson.fault) {
            throw new Error(errorJson.fault.faultstring || 'فشل في جلب حالة الشحنات');
          }
        } catch (e) {
          throw new Error('فشل في جلب حالة الشحنات');
        }
      }

      const statusResponse = await response.json();
      if (process.env.NODE_ENV !== 'production') {

      }

      // Process the response and update database
      const updatedShipments = [];
      
      // Check if statusResponse is an object with Colis property
      const shipmentsList = Array.isArray(statusResponse.Colis) ? statusResponse.Colis : 
                          Array.isArray(statusResponse) ? statusResponse : [];

      for (const tracking of trackingNumbers) {
        const apiShipment = shipmentsList.find(s => s.Tracking === tracking);
        if (!apiShipment) continue;

        // Find existing shipment or create new one
        let shipment = dbShipments.find(s => s.tracking === tracking);
        
        const shipmentData = {
          shop,
          tracking: apiShipment.Tracking,
          client: apiShipment.Client || '',
          mobileA: apiShipment.MobileA || '',
          mobileB: apiShipment.MobileB || '',
          address: apiShipment.Adresse || '',
          wilayaId: parseInt(apiShipment.IDWilaya || '0') || 0,
          wilaya: apiShipment.Wilaya || '',
          commune: apiShipment.Commune || '',
          total: parseFloat(apiShipment.Total || '0') || 0,
          note: apiShipment.Note || '',
          productType: apiShipment.TProduit || '',
          deliveryType: parseInt(apiShipment.TypeLivraison || '0') || 0,
          packageType: parseInt(apiShipment.TypeColis || '0') || 0,
          status: apiShipment.Situation || 'En Préparation',
          statusId: parseInt(apiShipment.IDSituation || '1'),
          deliveryFee: parseFloat(apiShipment.Tarif_Livrée || '0'),
          cancelFee: parseFloat(apiShipment.Tarif_Annuler || '0'),
          updatedAt: apiShipment.DateH_Action ? new Date(apiShipment.DateH_Action) : new Date()
        };

        try {
          // Parse creation date from API response
          let createdAt;
          if (apiShipment.Date_Creation) {
            createdAt = new Date(apiShipment.Date_Creation);
          } else if (apiShipment.DateA) {
            // Parse DateA format (YYYYMMDD)
            const year = apiShipment.DateA.substring(0, 4);
            const month = apiShipment.DateA.substring(4, 6);
            const day = apiShipment.DateA.substring(6, 8);
            createdAt = new Date(year, parseInt(month) - 1, day);
          } else {
            createdAt = trackingDates.has(tracking) ? 
              new Date(trackingDates.get(tracking)) : 
              new Date();
          }

          // Add debug logging for dates

          if (shipment) {
            // Update existing shipment
            shipment = await this.prisma.Shipment.update({
              where: { id: shipment.id },
              data: {
                ...shipmentData,
                createdAt: createdAt
              }
            });
          } else {
            // Create new shipment
            shipment = await this.prisma.Shipment.create({
              data: {
                ...shipmentData,
                externalId: this.generateExternalId(),
                createdAt: createdAt
              }
            });
          }
          updatedShipments.push(shipment);
        } catch (error) {
          console.error(`Error updating/creating shipment ${tracking}:`, error);
          console.error('API shipment data:', apiShipment);
          continue;
        }
      }

      return updatedShipments;
    } catch (error) {
      console.error('Get shipment statuses error:', error);
      throw error;
    }
  }

  async markAsReadyToShip(token, key, trackingNumbers) {
    try {
      if (!token || !key) {
        throw new Error('بيانات الاعتماد مطلوبة');
      }

      const payload = {
        Colis: trackingNumbers.map(tracking => ({ Tracking: tracking }))
      };

      const response = await fetch(`${this.baseUrl}/lire`, {
        method: 'POST',
        headers: {
          'Accept': 'application/json',
          'Content-Type': 'application/json',
          'token': token.trim(),
          'key': key.trim()
        },
        body: JSON.stringify(payload)
      });

      if (!response.ok) {
        const errorText = await response.text();
        try {
          const errorJson = JSON.parse(errorText);
          if (errorJson.fault) {
            throw new Error(errorJson.fault.faultstring || 'فشل في تحديث حالة الشحنات');
          }
        } catch (e) {
          throw new Error(errorText || 'فشل في تحديث حالة الشحنات');
        }
      }

      return await response.json();
    } catch (error) {
      console.error('Mark as ready error:', error);
      throw error;
    }
  }

  async getTarification(token, key) {
    try {
      if (!token || !key) {
        throw new Error('بيانات الاعتماد مطلوبة');
      }

      const response = await fetch(`${this.baseUrl}/tarification`, {
        method: 'POST',
        headers: {
          'Accept': 'application/json',
          'Content-Type': 'application/json',
          'token': token.trim(),
          'key': key.trim()
        },
        body: JSON.stringify({}) // Empty object for POST request
      });

      if (!response.ok) {
        const errorText = await response.text();
        try {
          const errorJson = JSON.parse(errorText);
          if (errorJson.fault) {
            throw new Error(errorJson.fault.faultstring || 'فشل في جلب التعرفة');
          }
        } catch (e) {
          throw new Error(errorText || 'فشل في جلب التعرفة');
        }
      }

      const data = await response.json();
      return Array.isArray(data) ? data : [];
    } catch (error) {
      console.error('Get tarification error:', error);
      throw error;
    }
  }

  async getRecentUpdates(token, key) {
    try {
      if (!token || !key) {
        throw new Error('بيانات الاعتماد مطلوبة');
      }

      const response = await fetch(`${this.baseUrl}/tarification`, {
        method: 'GET',
        headers: {
          'Accept': 'application/json',
          'token': token.trim(),
          'key': key.trim()
        }
      });

      if (!response.ok) {
        const errorText = await response.text();
        try {
          const errorJson = JSON.parse(errorText);
          if (errorJson.fault) {
            throw new Error(errorJson.fault.faultstring || 'فشل في جلب التحديثات');
          }
        } catch (e) {
          throw new Error(errorText || 'فشل في جلب التحديثات');
        }
      }

      const data = await response.json();
      return Array.isArray(data) ? data : [];
    } catch (error) {
      console.error('Get recent updates error:', error);
      throw error;
    }
  }

  async getNetProfit(shop, dateRange = null) {
    try {
      if (!shop) {
        throw new Error('Shop parameter is required');
      }

      let whereCondition = {
        shop: shop
      };

      // Add date range filter if provided
      if (dateRange && dateRange.start && dateRange.end) {
        whereCondition.updatedAt = {
          gte: new Date(dateRange.start),
          lte: new Date(dateRange.end)
        };
      }

      // Get all shipments for the shop within the date range
      const shipments = await this.prisma.shipment.findMany({
        where: whereCondition,
        select: {
          id: true,
          total: true,
          totalCost: true,
          totalRevenue: true,
          profit: true,
          deliveryFee: true,
          cancelFee: true,
          status: true,
          updatedAt: true
        }
      });

      let totalRevenue = 0;
      let totalCosts = 0;
      let totalDeliveryFees = 0;
      let totalCancelFees = 0;
      let deliveredCount = 0;
      let cancelledCount = 0;

      shipments.forEach(shipment => {
        const revenue = parseFloat(shipment.total || 0);
        const cost = parseFloat(shipment.totalCost || 0);
        const deliveryFee = parseFloat(shipment.deliveryFee || 0);
        const cancelFee = parseFloat(shipment.cancelFee || 0);

        if (shipment.status === "Livrée") {
          // Delivered shipments contribute to revenue
          totalRevenue += revenue;
          totalCosts += cost;
          totalDeliveryFees += deliveryFee;
          deliveredCount++;
        } else if (shipment.status === "Annulé" || shipment.status?.includes("Retour")) {
          // Cancelled/returned shipments only incur fees
          totalCancelFees += cancelFee;
          cancelledCount++;
        }
      });

      const netProfit = totalRevenue - totalCosts - totalDeliveryFees - totalCancelFees;

      return {
        success: true,
        data: {
          netProfit: netProfit,
          totalRevenue: totalRevenue,
          totalCosts: totalCosts,
          totalDeliveryFees: totalDeliveryFees,
          totalCancelFees: totalCancelFees,
          totalShipments: shipments.length,
          deliveredCount: deliveredCount,
          cancelledCount: cancelledCount,
          // Additional metrics
          profitMargin: totalRevenue > 0 ? (netProfit / totalRevenue) * 100 : 0,
          deliveryRate: shipments.length > 0 ? (deliveredCount / shipments.length) * 100 : 0
        }
      };

    } catch (error) {
      console.error('Error calculating ZR Express net profit:', error);
      return {
        success: false,
        error: error.message || 'Failed to calculate net profit'
      };
    }
  }

  // Helper methods
  generateTracking() {
    const prefix = 'ZR';
    const timestamp = Date.now().toString(36).toUpperCase();
    const random = Math.random().toString(36).substring(2, 5).toUpperCase();
    return `${prefix}${timestamp}${random}`;
  }

  generateExternalId() {
    return Date.now().toString(36).toUpperCase();
  }
}

export const zrexpress = new ZRExpressService();
