import { useCallback } from "react";
import { Card, Select, TextField, Button, InlineStack, Text, BlockStack } from "@shopify/polaris";

export default function FilterBar({
  datePresets,
  currentDatePreset,
  facebookAccounts,
  selectedAccount,
  exchangeRate,
  isLoading,
  onDatePresetChange,
  onAdAccountChange,
  onExchangeRateChange,
  onRecalculate,
  setRef
}) {
  const handleSubmit = useCallback((event) => {
    event.preventDefault();
    onRecalculate();
  }, [onRecalculate]);

  return (
    <Card>
      <BlockStack gap="400">
        <Text variant="headingMd" as="h2">خيارات التحليل</Text>
        <form onSubmit={handleSubmit}>
          <BlockStack gap="400">
            <InlineStack wrap={false} align="start" gap="400">
              <div style={{ flexGrow: 1 }}>
                <Select
                  label="الفترة الزمنية"
                  options={datePresets}
                  value={currentDatePreset}
                  onChange={onDatePresetChange}
                  disabled={isLoading}
                />
              </div>
              <div style={{ flexGrow: 1 }} ref={setRef}>
                <Select
                  label="حساب فيسبوك للإعلانات"
                  options={[{ label: "اختر حساب الإعلانات", value: "" }, ...(facebookAccounts || [])]}
                  value={selectedAccount?.id || ""}
                  onChange={onAdAccountChange}
                  disabled={isLoading}
                />
              </div>
              <div style={{ width: '180px' }}>
                <TextField
                  label="سعر الصرف (دج/دولار)"
                  type="number"
                  value={exchangeRate}
                  onChange={onExchangeRateChange}
                  autoComplete="off"
                  disabled={isLoading}
                />
              </div>
              <div style={{ marginTop: '22px' }}>
                <Button primary submit loading={isLoading}>
                  تحديث البيانات
                </Button>
              </div>
            </InlineStack>
          </BlockStack>
        </form>
      </BlockStack>
    </Card>
  );
}
