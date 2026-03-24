# 门票发行失败诊断指南

## 问题分析

门票发行失败可能的原因：

### 1. 权限问题
- **症状**：链上返回 "Only scenic operator can issue tickets"
- **原因**：调用者没有 `SCENIC_OPERATOR_ROLE` 角色
- **解决方案**：
  - 确认当前钱包地址是否已被授予景区运营方角色
  - 在 Auth 合约中检查角色授权

### 2. 子账户验证失败
- **症状**：链上返回 "Sub-account must belong to scenic operator"
- **原因**：传入的 `subAccount` 地址不是调用者的子账户
- **解决方案**：
  - 确认景区账户已创建子账户
  - 验证子账户所有权关系

### 3. 时间验证失败
- **症状**：链上返回 "End time must be in the future" 或 "Invalid validity period"
- **原因**：
  - `validUntil` 时间戳小于等于当前区块时间
  - `validUntil` 小于等于 `validFrom`
- **解决方案**：
  - 确保结束日期在未来
  - 确保结束日期晚于开始日期

### 4. 发行数量问题
- **症状**：链上返回 "Total supply must be greater than 0"
- **原因**：`totalSupply` 为 0 或负数
- **解决方案**：
  - 确保发行数量大于 0

### 5. 价格参数问题（已修复）
- **症状**：交易被回滚，参数类型错误
- **原因**：前端已使用 `fiatToRaw()` 转换价格，后端不应再次转换
- **解决方案**：已在 `FiatAmountConverter.java` 中移除对 Ticket 合约的重复转换

## 调试步骤

1. **检查后端日志**
   ```bash
   cd /Users/hqsk/Work/kxdex/KXBASE/backend
   tail -f logs/application.log
   ```

2. **检查前端控制台**
   - 打开浏览器开发者工具
   - 查看 Network 标签中的请求和响应
   - 查看 Console 标签中的错误信息

3. **验证合约交互面板**
   - 页面底部的 ContractInteractionPanel 会显示详细的交互信息
   - 检查 `response.message` 字段获取具体错误信息

4. **手动验证权限**
   ```javascript
   // 在浏览器控制台执行
   const roleHash = await contractService.call('Auth', 'SCENIC_OPERATOR_ROLE', [], ['bytes32']);
   const hasRole = await contractService.call('Auth', 'hasRole', [roleHash[0], '景区地址'], ['bool']);
   console.log('Has scenic role:', hasRole[0]);
   ```

5. **验证子账户**
   ```javascript
   // 在浏览器控制台执行
   const subAccounts = await contractService.getSubAccounts('景区主账户地址');
   console.log('Sub accounts:', subAccounts);
   ```

## 已修复的问题

### 价格参数双重转换问题
- **问题**：前端使用 `fiatToRaw()` 将价格从小数转换为整数（如 190 -> 1900000），后端的 `FiatAmountConverter` 又尝试再次转换，导致参数错误
- **修复**：在 `FiatAmountConverter.java` 中移除了对 Ticket 合约 `issueTicket` 方法的转换逻辑
- **文件**：`KXBASE/backend/src/main/java/com/kxdex/wallet/backend/util/FiatAmountConverter.java`

## 测试建议

1. 重启后端服务以应用修复
2. 清除浏览器缓存并刷新前端页面
3. 使用有效的景区账户进行测试
4. 确保景区账户已创建子账户
5. 选择未来的有效期日期
