### ZRExpress API - Lire (Read) Endpoint

```bash
curl -X POST 'https://procolis.com/api_v1/lire' \
  -H 'Accept: application/json' \
  -H 'Content-Type: application/json' \
  -H 'token: YOUR_TOKEN_HERE' \
  -H 'key: YOUR_KEY_HERE' \
  -d '{
    "Colis": [
      {
        "Tracking": "YOUR_TRACKING_NUMBER"
      }
    ]
  }'
```

### Example with Multiple Tracking Numbers

```bash
curl -X POST 'https://procolis.com/api_v1/lire' \
  -H 'Accept: application/json' \
  -H 'Content-Type: application/json' \
  -H 'token: YOUR_TOKEN_HERE' \
  -H 'key: YOUR_KEY_HERE' \
  -d '{
    "Colis": [
      {
        "Tracking": "TRACKING_1"
      },
      {
        "Tracking": "TRACKING_2"
      }
    ]
  }'
```

### Response Format
The API will return a JSON response with the status of each shipment:

```json
{
  "Colis": [
    {
      "Tracking": "TRACKING_NUMBER",
      "Situation": "SHIPMENT_STATUS",
      "IDSituation": "STATUS_ID",
      "Wilaya": "WILAYA_NAME"
    }
  ]
}
```

Replace:
- YOUR_TOKEN_HERE with your ZRExpress token
- YOUR_KEY_HERE with your ZRExpress key
- TRACKING_NUMBER with the actual tracking number(s) you want to query 