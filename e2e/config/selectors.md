# 🎯 Selector Mapping and Rules for Binance Arbitrage Bot Automation

## **Testing Selectors Priority and Rules**

### **1. Selector Priority (Recommended Order)**
1. **data-testid attributes** (PRIMARY - most stable)
2. **ID attributes** (when available and semantic)
3. **Semantic role attributes** (role="button", etc.)
4. **Text-based selectors** (as last resort, fragile to content changes)
5. **NEVER use**: nth-child, complex CSS selectors without stable attributes

### **2. Core Principle**
> **Always prefer `page.getByTestId('selector-name')` over any other selector method**

---

## **📋 Complete Selector Map**

### **API Key Management**
| Element | Selector | Purpose |
|---------|----------|---------|
| Main Container | `api-key-manager` | Root API key management section |
| Title | `api-key-title` | Section heading |
| Keys Status (Exists) | `api-keys-exist` | Container when keys are stored |
| Keys Status Message | `api-keys-stored-message` | Success message text |
| Delete Button | `delete-keys-button` | Remove stored keys |
| Input Form | `api-key-form` | Form container for new keys |
| API Key Input | `api-key-input` | Binance API key field |
| API Secret Input | `api-secret-input` | Binance secret key field |
| Password Input | `password-input` | Encryption password field |
| Save Button | `save-keys-button` | Save and encrypt keys |
| Error Message | `api-key-error` | Error display |
| Success Message | `api-key-success` | Success confirmation |

### **NEWT Bot Creator**
| Element | Selector | Purpose |
|---------|----------|---------|
| Main Container | `newt-bot-creator` | Root bot creator section |
| Bot Name Input | `bot-name-input` | Bot name field |
| Symbol Input | `bot-symbol-input` | Trading symbol field |
| Investment Input | `bot-investment-input` | Investment amount field |
| Leverage Select | `bot-leverage-select` | Leverage dropdown |
| Auto-Managed Checkbox | `auto-managed-checkbox` | Auto management option |
| Auto-Convert Checkbox | `auto-convert-checkbox` | Auto asset conversion |
| Dry Run Checkbox | `dry-run-checkbox` | Test mode toggle |
| Create Button | `create-bot-button` | Create bot action |
| Error Message | `bot-error-message` | Error display |
| Success Message | `bot-success-message` | Success confirmation |

### **Implement Bot Modal**
| Element | Selector | Purpose |
|---------|----------|---------|
| Modal Container | `implement-bot-modal` | Root modal overlay |
| Form Container | `implement-bot-form` | Modal content |
| Bot Name Input | `modal-bot-name-input` | Bot name field |
| Investment Input | `modal-investment-input` | Investment amount |
| Leverage Slider | `modal-leverage-slider` | Leverage adjustment |
| Auto-Managed Checkbox | `modal-auto-managed-checkbox` | Auto management |
| Risk Acknowledgment | `modal-risk-acknowledgment-checkbox` | Risk acceptance |
| Cancel Button | `modal-cancel-button` | Close modal |
| Launch Button | `modal-launch-button` | Confirm bot creation |

### **Funding Rates Table** (To be added)
| Element | Selector | Purpose |
|---------|----------|---------|
| Table Container | `funding-rates-table` | Main table wrapper |
| Table Header | `funding-rates-header` | Column headers |
| Table Rows | `funding-rate-row-{symbol}` | Individual symbol rows |
| Symbol Cell | `symbol-cell-{symbol}` | Symbol name |
| Funding Rate Cell | `funding-rate-cell-{symbol}` | Current rate |
| APR Cell | `apr-cell-{symbol}` | Annualized percentage |
| Action Button | `action-button-{symbol}` | Create bot action |

### **Active Bots Panel** (To be added)
| Element | Selector | Purpose |
|---------|----------|---------|
| Panel Container | `active-bots-panel` | Main bots list |
| Bot Row | `bot-row-{botId}` | Individual bot row |
| Bot Status | `bot-status-{botId}` | Status indicator |
| Profit Target | `profit-target-{botId}` | Target setting |
| Stop Loss | `stop-loss-{botId}` | Stop loss setting |
| Close Button | `close-bot-{botId}` | Close individual bot |
| Close All Button | `close-all-bots` | Close all bots |

### **Account Status Panel** (To be added)
| Element | Selector | Purpose |
|---------|----------|---------|
| Panel Container | `account-status-panel` | Main account info |
| Balance Display | `account-balance` | Total balance |
| Equity Display | `account-equity` | Total equity |
| Margin Usage | `margin-usage` | Margin utilization |
| Available Balance | `available-balance` | Free funds |

### **PnL Summary Panel** (To be added)
| Element | Selector | Purpose |
|---------|----------|---------|
| Panel Container | `pnl-summary-panel` | PnL information |
| Total PnL | `total-pnl` | Overall profit/loss |
| Daily PnL | `daily-pnl` | Today's performance |
| Weekly PnL | `weekly-pnl` | Week's performance |
| ROI Percentage | `roi-percentage` | Return on investment |

---

## **🔧 Playwright Usage Examples**

### **Basic Operations**
```typescript
// ✅ CORRECT - Using data-testid
await page.getByTestId('api-key-input').fill('your-api-key');
await page.getByTestId('save-keys-button').click();

// ✅ CORRECT - Checking for element presence
await expect(page.getByTestId('api-key-success')).toBeVisible();

// ❌ INCORRECT - Fragile selectors
await page.locator('.bg-yellow-500').click(); // CSS classes can change
await page.locator('input:nth-child(3)').fill('value'); // Position-based
```

### **Complex Interactions**
```typescript
// ✅ Bot creation flow
await page.getByTestId('bot-symbol-input').fill('BTCUSDT');
await page.getByTestId('bot-investment-input').fill('100');
await page.getByTestId('bot-leverage-select').selectOption('5');
await page.getByTestId('dry-run-checkbox').check();
await page.getByTestId('create-bot-button').click();

// ✅ Modal interaction
await expect(page.getByTestId('implement-bot-modal')).toBeVisible();
await page.getByTestId('modal-risk-acknowledgment-checkbox').check();
await page.getByTestId('modal-launch-button').click();
```

### **Data Validation**
```typescript
// ✅ Extract data using stable selectors
const accountBalance = await page.getByTestId('account-balance').textContent();
const botStatus = await page.getByTestId('bot-status-bot123').textContent();
const fundingRate = await page.getByTestId('funding-rate-cell-BTCUSDT').textContent();
```

---

## **📊 Selector Stability Guidelines**

### **HIGH Stability** ⭐⭐⭐
- `data-testid` attributes (custom added)
- Element `id` attributes (when semantic)

### **MEDIUM Stability** ⭐⭐
- `role` attributes (button, textbox, etc.)
- `aria-label` attributes
- Text content (when unique and stable)

### **LOW Stability** ⭐
- CSS classes (can change with styling updates)
- Tag names + positions (nth-child)
- Complex CSS selectors

### **NEVER USE** ❌
- `nth-child()` without stable parent attributes
- Pure CSS class selectors for functionality
- XPath with positions
- Element positions in DOM tree

---

## **🚨 Critical Automation Points**

### **Authentication Flow**
1. Check if keys exist: `api-keys-exist` presence
2. If not, fill keys: `api-key-input`, `api-secret-input`, `password-input`
3. Save: `save-keys-button`
4. Wait for success: `api-key-success` visible

### **Bot Creation Flow**
1. Configure bot: All `bot-*-input` fields
2. Set options: `auto-managed-checkbox`, `dry-run-checkbox`
3. Create: `create-bot-button`
4. Handle modal: `implement-bot-modal` → `modal-launch-button`
5. Confirm success: `bot-success-message`

### **Monitoring Flow**
1. Check active bots: `active-bots-panel`
2. Read account status: `account-status-panel`
3. Monitor PnL: `pnl-summary-panel`
4. Watch funding rates: `funding-rates-table`

---

## **⚡ Performance Tips**

1. **Use waitFor with testIds**: More reliable than generic waits
2. **Batch similar operations**: Fill multiple fields before clicking
3. **Wait for specific state changes**: Use testId-based assertions
4. **Avoid polling**: Use event-based waits when possible

### **Example: Robust Element Waiting**
```typescript
// ✅ Wait for specific element to be ready
await page.getByTestId('funding-rates-table').waitFor({ state: 'visible' });

// ✅ Wait for data to load
await expect(page.getByTestId('account-balance')).not.toContainText('Loading...');

// ✅ Wait for form submission result
await expect(page.getByTestId('api-key-success')).toBeVisible({ timeout: 10000 });
```

---

## **🔄 Future Selector Additions**

When adding new components that need automation:

1. **Add data-testid** to the component JSX
2. **Update this document** with the new selectors
3. **Follow naming convention**: `component-purpose-element`
4. **Test selector stability** in different browser states
5. **Document in POM classes** with proper TypeScript typing

### **Naming Convention**
- Format: `{component}-{purpose}-{element}`
- Examples: `funding-table-row`, `bot-status-indicator`, `account-balance-display`
- Use kebab-case for all data-testid values
- Be descriptive but concise
