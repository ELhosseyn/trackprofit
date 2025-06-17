import { json } from "@remix-run/node";
import { useLoaderData, useNavigate, useSubmit } from "@remix-run/react";
import React, { useState, useCallback, useEffect } from "react";
import {
  Page,
  Layout,
  Card,
  Button,
  Text,
  Modal,
  TextContainer,
  TextField,
  Banner,
  Loading,
  Frame,
  Toast,
  Tabs,
  ButtonGroup,
  EmptyState,
  FormLayout,
  Spinner
} from "@shopify/polaris";

import { authenticate } from "../shopify.server";
import { zrexpress } from "../services/zrexpress.server";
import prisma from "../db.server";

export const loader = async ({ request }) => {
  const { session } = await authenticate.admin(request);
  
  try {
    console.log('Checking ZRExpress credentials for shop:', session.shop);
    
    const credentials = await prisma.zrexpressCredential.findUnique({
      where: { shop: session.shop }
    });

    console.log('Found credentials:', credentials ? 'Yes' : 'No');
    
    let isConnected = false;
    let connectionError = null;
    
    if (credentials) {
      try {
        console.log('Testing connection with ZRExpress...');
        await zrexpress.validateCredentials(credentials.token, credentials.key);
        isConnected = true;
        console.log('Connection successful');
      } catch (error) {
        console.error('Connection test failed:', error);
        connectionError = error.message;
      }
    } else {
      console.log('No credentials found for shop');
    }

    return json({
      shop: session.shop,
      isConnected,
      hasCredentials: !!credentials,
      connectionError
    });
  } catch (error) {
    console.error('Loader error:', error);
    return json({
      shop: session.shop,
      isConnected: false,
      hasCredentials: false,
      error: error.message
    });
  }
};

export default function ZRExpress() {
  const { shop, isConnected, hasCredentials, connectionError } = useLoaderData();
  const submit = useSubmit();
  const [selectedTab, setSelectedTab] = useState(0);
  const [showCredentialsModal, setShowCredentialsModal] = useState(false);
  const [loading, setLoading] = useState(false);
  const [toastMessage, setToastMessage] = useState(null);
  const [credentials, setCredentials] = useState({
    token: "",
    key: ""
  });

  const tabs = [
    {
      id: 'dashboard',
      content: 'لوحة التحكم',
      accessibilityLabel: 'لوحة التحكم',
      panelID: 'dashboard-panel',
    },
    {
      id: 'shipments',
      content: 'الشحنات',
      accessibilityLabel: 'الشحنات',
      panelID: 'shipments-panel',
    },
    {
      id: 'settings',
      content: 'الإعدادات',
      accessibilityLabel: 'الإعدادات',
      panelID: 'settings-panel',
    },
  ];

  const handleSaveCredentials = useCallback(async () => {
    if (!credentials.token || !credentials.key) {
      setToastMessage({ 
        content: "يرجى إدخال رمز الوصول ومفتاح الوصول", 
        error: true 
      });
      return;
    }

    setLoading(true);
    try {
      const formData = new FormData();
      formData.append('action', 'saveCredentials');
      formData.append('token', credentials.token.trim());
      formData.append('key', credentials.key.trim());

      const response = await fetch('/api/zrexpress', {
        method: 'POST',
        body: formData
      });

      const data = await response.json();
      console.log('Save credentials response:', data);

      if (!data.success) {
        throw new Error(data.error || 'فشل في حفظ بيانات الاعتماد');
      }

      setToastMessage({ content: "تم حفظ بيانات الاعتماد بنجاح", error: false });
      setShowCredentialsModal(false);
      
      // Use submit instead of window.location.reload()
      submit(null, { method: "get" });
    } catch (error) {
      console.error('Save credentials error:', error);
      setToastMessage({ 
        content: error.message || "حدث خطأ أثناء حفظ البيانات", 
        error: true 
      });
    } finally {
      setLoading(false);
    }
  }, [credentials, submit]);

  const toastMarkup = toastMessage && (
    <Toast
      content={toastMessage.content}
      error={toastMessage.error}
      onDismiss={() => setToastMessage(null)}
      duration={3000}
    />
  );

  return (
    <Frame>
      <Page
        title="ZR Express - إدارة الشحن"
        primaryAction={
          <Button
            primary={!isConnected}
            onClick={() => setShowCredentialsModal(true)}
          >
            {isConnected ? "تعديل بيانات الاتصال" : "ربط ZR Express"}
          </Button>
        }
      >
        {!isConnected && (
          <Layout.Section>
            <Banner
              title="حالة الاتصال"
              status="warning"
            >
              <p>
                {connectionError 
                  ? `فشل الاتصال: ${connectionError}`
                  : "يجب ربط حساب ZR Express أولاً لاستخدام خدمة الشحن"}
              </p>
            </Banner>
          </Layout.Section>
        )}

        <Card>
          <Tabs
            tabs={tabs}
            selected={selectedTab}
            onSelect={setSelectedTab}
            fitted
          />
          <Card.Section>
            {selectedTab === 0 ? (
              <DashboardPanel 
                isConnected={isConnected}
                onTabChange={setSelectedTab}
              />
            ) : (
              <EmptyState
                heading="قريباً"
                image={null}
                imageContained
              >
                <p>هذه الميزة قيد التطوير</p>
              </EmptyState>
            )}
          </Card.Section>
        </Card>

        <Modal
          open={showCredentialsModal}
          onClose={() => setShowCredentialsModal(false)}
          title={isConnected ? "تعديل بيانات ZR Express" : "ربط حساب ZR Express"}
          primaryAction={{
            content: "حفظ",
            onAction: handleSaveCredentials,
            loading: loading,
            disabled: !credentials.token || !credentials.key
          }}
          secondaryActions={[
            {
              content: "إلغاء",
              onAction: () => setShowCredentialsModal(false)
            }
          ]}
        >
          <Modal.Section>
            <FormLayout>
              <TextField
                label="رمز الوصول (Token)"
                value={credentials.token}
                onChange={(value) => setCredentials({ ...credentials, token: value })}
                autoComplete="off"
                type="password"
                requiredIndicator
                error={!credentials.token && "رمز الوصول مطلوب"}
              />
              <TextField
                label="مفتاح الوصول (Key)"
                value={credentials.key}
                onChange={(value) => setCredentials({ ...credentials, key: value })}
                autoComplete="off"
                type="password"
                requiredIndicator
                error={!credentials.key && "مفتاح الوصول مطلوب"}
              />
            </FormLayout>
          </Modal.Section>
        </Modal>

        {loading && <Loading />}
        {toastMarkup}
      </Page>
    </Frame>
  );
} 