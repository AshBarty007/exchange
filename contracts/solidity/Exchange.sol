// SPDX-License-Identifier: MIT
pragma solidity ^0.8.0;

import "./Utils.sol";
import "./IAuth.sol";
import "./IAccount.sol";
import "./IFiatToken.sol";
import "./ITicket.sol";
import "./IExchange.sol";

/**
 * @title Exchange
 * @dev 链上交易撮合逻辑合约
 * @notice 订单/成交数据存储在本合约，锁定余额通过 FiatToken/Ticket 的 Storage 层持久化
 *         升级时：重新部署本合约，传入相同的 Storage 地址，订单数据需迁移（或通知用户重新挂单）
 */
contract Exchange is NonceManager, IExchange {

    uint256 public constant FEE_RATE = 50; // 0.5%
    uint256 public constant MAX_SIGNATURE_VALIDITY = 1 hours;

    // EIP-712 域分隔符
    bytes32 public immutable DOMAIN_SEPARATOR;

    // EIP-712 类型哈希
    bytes32 public constant CREATE_ORDER_TYPEHASH = keccak256(
        "CreateOrder(address subAccount,uint8 orderType,uint256 ticketId,uint256 price,uint256 amount,uint256 nonce,uint256 expiry)"
    );

    bytes32 public constant CANCEL_ORDER_TYPEHASH = keccak256(
        "CancelOrder(uint256 orderId,uint256 expiry)"
    );

    IAuth    private _auth;
    IAccount private _accountContract;
    IFiatToken private _fiatToken;
    ITicket  private _ticket;

    address public feeCollector;

    uint256 private _orderIdCounter;
    uint256 private _tradeIdCounter;

    mapping(uint256 => Order)   private _orders;
    mapping(uint256 => Trade)   private _trades;
    mapping(address => uint256[]) private _accountOrders;
    mapping(address => uint256[]) private _accountTrades;  // 账户 -> tradeId 索引，替代全量扫描
    mapping(uint256 => uint256[]) private _ticketOrderBook;
    mapping(uint256 => uint256[]) private _ticketTrades;   // 门票 -> tradeId 索引，替代全量扫描
    // 只存活跃订单（PENDING/PARTIAL），成交或撤单时移除
    mapping(uint256 => uint256[]) private _activeOrderBook;

    // 锁定余额：挂单时锁定，成交/撤单时释放
    mapping(address => uint256)                      private _lockedFiat;
    mapping(address => mapping(uint256 => uint256))  private _lockedTicket;

    event OrderCreated(uint256 indexed orderId, address indexed account, OrderType orderType, uint256 ticketId, uint256 price, uint256 amount);
    event OrderCancelled(uint256 indexed orderId, address indexed account);
    event OrderFilled(uint256 indexed orderId, uint256 filledAmount);
    event TradeExecuted(uint256 indexed tradeId, uint256 buyOrderId, uint256 sellOrderId, address buyer, address seller, uint256 amount, uint256 price);

    error InvalidOrder(uint256 orderId);
    error OrderNotActive(uint256 orderId);
    error InsufficientBalance(address account);
    error UnauthorizedCancellation(address caller, uint256 orderId);

    constructor(
        address authContract,
        address accountContract,
        address fiatTokenContract,
        address ticketContract,
        address _feeCollector
    ) {
        _auth             = IAuth(authContract);
        _accountContract  = IAccount(accountContract);
        _fiatToken        = IFiatToken(fiatTokenContract);
        _ticket           = ITicket(ticketContract);
        feeCollector      = _feeCollector;
        _orderIdCounter   = 1;
        _tradeIdCounter   = 1;

        // 初始化 EIP-712 域分隔符
        DOMAIN_SEPARATOR = keccak256(abi.encode(
            keccak256("EIP712Domain(string name,string version,uint256 chainId,address verifyingContract)"),
            keccak256("KXDEX Exchange"),
            keccak256("1"),
            block.chainid,
            address(this)
        ));
    }

    // ==================== 下单入口 ====================

    /**
     * @dev 创建订单（主账户完全隔离版本）
     * @param subAccount 实际持有资产的子账户地址
     * @param orderType 订单类型
     * @param ticketId 门票ID
     * @param price 价格
     * @param amount 数量
     * @param expiry 签名过期时间戳
     * @param mainAccountSignature 主账户对订单参数的签名，用于验证授权
     *
     * msg.sender 可以是任何人（子账户本身、中继服务等），不会被记录
     * 主账户地址仅通过签名恢复，不出现在任何链上交易的 msg.sender 中
     */
    function createOrder(
        address subAccount,
        OrderType orderType,
        uint256 ticketId,
        uint256 price,
        uint256 amount,
        uint256 expiry,
        bytes memory mainAccountSignature
    ) public returns (uint256) {
        require(block.timestamp <= expiry, "Signature expired");
        require(expiry <= block.timestamp + MAX_SIGNATURE_VALIDITY, "Expiry too far in future");

        // 从签名恢复主账户地址
        address mainAccount = _accountContract.getMainAccount(subAccount);
        require(mainAccount != subAccount, "Not a sub-account");

        // 获取主账户当前 nonce，构造 EIP-712 结构哈希
        uint256 nonce = getNonce(mainAccount);
        bytes32 structHash = keccak256(abi.encode(
            CREATE_ORDER_TYPEHASH,
            subAccount, orderType, ticketId, price, amount, nonce, expiry
        ));
        bytes32 digest = Utils.toTypedDataHash(DOMAIN_SEPARATOR, structHash);

        // 验证签名确实来自该主账户
        address recovered = Utils.recoverSigner(digest, mainAccountSignature);
        require(recovered == mainAccount, "Invalid main account signature");

        return _createOrderFor(subAccount, mainAccount, orderType, ticketId, price, amount, expiry, mainAccountSignature);
    }

    // ==================== 内部：创建订单 ====================

    function _createOrderFor(
        address subAccount,
        address mainAccount,
        OrderType orderType,
        uint256 ticketId,
        uint256 price,
        uint256 amount,
        uint256 expiry,
        bytes memory signature
    ) internal returns (uint256) {
        require(!_auth.isFrozen(subAccount), "Sub-account is frozen");
        require(!_auth.isFrozen(mainAccount), "Main account is frozen");
        require(amount > 0, "Amount must be greater than 0");
        require(price > 0, "Price must be greater than 0");

        // 校验价格在门票允许范围内
        (uint256 minPrice, uint256 maxPrice) = _ticket.getTicketPriceRange(ticketId);
        require(price >= minPrice, "Price below ticket min price");
        require(price <= maxPrice, "Price above ticket max price");

        // 检查并锁定可用余额（余额在子账户上）
        if (orderType == OrderType.BUY) {
            uint256 totalCost = price * amount;
            uint256 available = _fiatToken.balanceOf(subAccount) - _lockedFiat[subAccount];
            require(available >= totalCost, "Insufficient available fiat balance");
            _lockedFiat[subAccount] += totalCost;
        } else {
            uint256 available = _ticket.balanceOf(subAccount, ticketId) - _lockedTicket[subAccount][ticketId];
            require(available >= amount, "Insufficient available ticket balance");
            _lockedTicket[subAccount][ticketId] += amount;
        }

        // nonce 消耗在主账户维度（签名是主账户签的）
        uint256 nonce = _useNonce(mainAccount);
        bytes32 orderHash = keccak256(abi.encodePacked(ticketId, price, amount, subAccount, nonce));
        uint256 orderId = _orderIdCounter++;

        _orders[orderId] = Order({
            orderId:      orderId,
            account:      subAccount,
            orderType:    orderType,
            ticketId:     ticketId,
            price:        price,
            amount:       amount,
            filledAmount: 0,
            status:       OrderStatus.PENDING,
            createdAt:    block.timestamp,
            expiry:       expiry,
            orderHash:    orderHash,
            signature:    signature
        });

        _accountOrders[subAccount].push(orderId);
        _ticketOrderBook[ticketId].push(orderId);
        _activeOrderBook[ticketId].push(orderId);

        emit OrderCreated(orderId, subAccount, orderType, ticketId, price, amount);

        _autoMatch(orderId);

        return orderId;
    }

    // ==================== 撤单 ====================

    /**
     * @dev 撤单（主账户完全隔离版本）
     * @param orderId 订单ID
     * @param expiry 签名过期时间戳；管理员撤单时传 0
     * @param mainAccountSignature 主账户对 (orderId, "cancel", expiry) 的签名；管理员撤单时传空 bytes
     *
     * 三种合法调用者：
     *   1. 主账户签名授权 —— 主账户不上链，只验签
     *   2. 管理员直接调用（expiry=0, mainAccountSignature 为空）
     */
    function cancelOrder(uint256 orderId, uint256 expiry, bytes memory mainAccountSignature) public returns (bool) {
        Order storage order = _orders[orderId];

        require(order.orderId != 0, "Order does not exist");
        require(
            order.status == OrderStatus.PENDING || order.status == OrderStatus.PARTIAL,
            "Order cannot be cancelled"
        );

        if (_auth.isAnyAdmin(msg.sender)) {
            // 管理员直接撤单，无需签名
        } else {
            require(block.timestamp <= expiry, "Signature expired");
            require(expiry <= block.timestamp + MAX_SIGNATURE_VALIDITY, "Expiry too far in future");

            // 验证主账户签名
            address mainAccount = _accountContract.getMainAccount(order.account);
            require(mainAccount != order.account, "Order account is not a sub-account");

            bytes32 structHash = keccak256(abi.encode(
                CANCEL_ORDER_TYPEHASH,
                orderId, expiry
            ));
            bytes32 digest = Utils.toTypedDataHash(DOMAIN_SEPARATOR, structHash);
            address recovered = Utils.recoverSigner(digest, mainAccountSignature);
            require(recovered == mainAccount, "Invalid main account signature");
        }

        order.status = OrderStatus.CANCELLED;

        // 释放锁定余额（剩余未成交部分）
        uint256 remaining = order.amount - order.filledAmount;
        if (order.orderType == OrderType.BUY) {
            uint256 lockedCost = order.price * remaining;
            if (_lockedFiat[order.account] >= lockedCost) {
                _lockedFiat[order.account] -= lockedCost;
            }
        } else {
            if (_lockedTicket[order.account][order.ticketId] >= remaining) {
                _lockedTicket[order.account][order.ticketId] -= remaining;
            }
        }

        _removeFromActiveOrderBook(order.ticketId, orderId);

        emit OrderCancelled(orderId, order.account);
        return true;
    }

    // ==================== 撮合 ====================

    function _autoMatch(uint256 newOrderId) internal {
        Order storage newOrder = _orders[newOrderId];
        if (newOrder.status == OrderStatus.FILLED || newOrder.status == OrderStatus.CANCELLED) return;

        uint256[] storage activeBook = _activeOrderBook[newOrder.ticketId];

        for (uint256 i = 0; i < activeBook.length; ) {
            uint256 candidateId = activeBook[i];
            if (candidateId == newOrderId) { i++; continue; }

            Order storage candidate = _orders[candidateId];
            if (!_canMatch(newOrder, candidate)) { i++; continue; }

            uint256 newRemaining       = newOrder.amount - newOrder.filledAmount;
            uint256 candidateRemaining = candidate.amount - candidate.filledAmount;
            uint256 matchAmount        = newRemaining < candidateRemaining ? newRemaining : candidateRemaining;

            if (newOrder.orderType == OrderType.BUY) {
                _executeTrade(newOrderId, candidateId, matchAmount);
            } else {
                _executeTrade(candidateId, newOrderId, matchAmount);
            }

            // 若 candidate 已完全成交，从活跃簿移除（swap-and-pop，不递增 i）
            if (candidate.status == OrderStatus.FILLED) {
                activeBook[i] = activeBook[activeBook.length - 1];
                activeBook.pop();
            } else {
                i++;
            }

            if (newOrder.status == OrderStatus.FILLED) break;
        }

        // 新订单完全成交则从活跃簿移除
        if (newOrder.status == OrderStatus.FILLED) {
            _removeFromActiveOrderBook(newOrder.ticketId, newOrderId);
        }
    }

    function _removeFromActiveOrderBook(uint256 ticketId, uint256 orderId) internal {
        uint256[] storage activeBook = _activeOrderBook[ticketId];
        for (uint256 i = 0; i < activeBook.length; i++) {
            if (activeBook[i] == orderId) {
                activeBook[i] = activeBook[activeBook.length - 1];
                activeBook.pop();
                break;
            }
        }
    }

    function _canMatch(Order storage o1, Order storage o2) internal view returns (bool) {
        if (o1.orderType == o2.orderType) return false;
        if (o1.ticketId  != o2.ticketId)  return false;
        if (o1.status != OrderStatus.PENDING && o1.status != OrderStatus.PARTIAL) return false;
        if (o2.status != OrderStatus.PENDING && o2.status != OrderStatus.PARTIAL) return false;

        uint256 buyPrice  = o1.orderType == OrderType.BUY  ? o1.price : o2.price;
        uint256 sellPrice = o1.orderType == OrderType.SELL ? o1.price : o2.price;
        return buyPrice >= sellPrice;
    }

    // ==================== 成交结算 ====================

    function _executeTrade(uint256 buyOrderId, uint256 sellOrderId, uint256 amount) internal {
        Order storage buyOrder  = _orders[buyOrderId];
        Order storage sellOrder = _orders[sellOrderId];

        uint256 tradePrice    = sellOrder.price;
        uint256 totalPrice    = tradePrice * amount;
        uint256 fee           = Utils.calculatePercentage(totalPrice, FEE_RATE);
        uint256 sellerReceives = totalPrice - fee;

        // 释放买方锁定法币：按挂单价锁定，按成交价（卖价）实际转出，差价归还给买方可用余额
        uint256 buyerLockedCost = buyOrder.price * amount;
        if (_lockedFiat[buyOrder.account] >= buyerLockedCost) {
            _lockedFiat[buyOrder.account] -= buyerLockedCost;
        }
        // totalPrice = tradePrice * amount（按卖价），buyerLockedCost >= totalPrice
        // 差价 (buyerLockedCost - totalPrice) 已随锁定释放，自动回到买方可用余额，无需额外操作

        // 释放卖方锁定门票
        if (_lockedTicket[sellOrder.account][sellOrder.ticketId] >= amount) {
            _lockedTicket[sellOrder.account][sellOrder.ticketId] -= amount;
        }

        // 资产交换
        require(_fiatToken.transferFrom(buyOrder.account, sellOrder.account, sellerReceives), "Fiat transfer to seller failed");
        if (fee > 0) {
            require(_fiatToken.transferFrom(buyOrder.account, feeCollector, fee), "Fee transfer failed");
        }
        require(_ticket.transferFrom(sellOrder.account, buyOrder.account, sellOrder.ticketId, amount), "Ticket transfer failed");

        // 更新订单状态
        buyOrder.filledAmount  += amount;
        sellOrder.filledAmount += amount;

        buyOrder.status  = buyOrder.filledAmount  == buyOrder.amount  ? OrderStatus.FILLED : OrderStatus.PARTIAL;
        sellOrder.status = sellOrder.filledAmount == sellOrder.amount ? OrderStatus.FILLED : OrderStatus.PARTIAL;

        // 记录成交
        uint256 tradeId = _tradeIdCounter++;
        _trades[tradeId] = Trade({
            tradeId:     tradeId,
            buyOrderId:  buyOrderId,
            sellOrderId: sellOrderId,
            buyer:       buyOrder.account,
            seller:      sellOrder.account,
            ticketId:    sellOrder.ticketId,
            price:       tradePrice,
            amount:      amount,
            fee:         fee,
            timestamp:   block.timestamp,
            tradeHash:   keccak256(abi.encodePacked(tradeId, buyOrderId, sellOrderId, amount, block.timestamp))
        });

        // 维护账户和门票成交索引，避免全量扫描
        _accountTrades[buyOrder.account].push(tradeId);
        _accountTrades[sellOrder.account].push(tradeId);
        _ticketTrades[sellOrder.ticketId].push(tradeId);

        emit TradeExecuted(tradeId, buyOrderId, sellOrderId, buyOrder.account, sellOrder.account, amount, tradePrice);
        emit OrderFilled(buyOrderId, amount);
        emit OrderFilled(sellOrderId, amount);
    }

    // ==================== 管理员手动撮合 ====================

    function matchOrders(uint256 buyOrderId, uint256 sellOrderId, uint256 amount) public returns (uint256) {
        require(_auth.hasRole(_auth.EXCHANGE_ADMIN_ROLE(), msg.sender), "Only exchange admin can match orders");

        Order storage buyOrder  = _orders[buyOrderId];
        Order storage sellOrder = _orders[sellOrderId];

        require(buyOrder.orderType  == OrderType.BUY,  "Invalid buy order");
        require(sellOrder.orderType == OrderType.SELL, "Invalid sell order");
        require(buyOrder.ticketId   == sellOrder.ticketId, "Ticket mismatch");
        require(buyOrder.status  == OrderStatus.PENDING || buyOrder.status  == OrderStatus.PARTIAL, "Buy order not active");
        require(sellOrder.status == OrderStatus.PENDING || sellOrder.status == OrderStatus.PARTIAL, "Sell order not active");
        require(buyOrder.price >= sellOrder.price, "Price mismatch");

        uint256 buyRemaining  = buyOrder.amount  - buyOrder.filledAmount;
        uint256 sellRemaining = sellOrder.amount - sellOrder.filledAmount;
        require(amount <= buyRemaining && amount <= sellRemaining, "Invalid match amount");

        _executeTrade(buyOrderId, sellOrderId, amount);

        // 手动撮合后同步清理活跃订单簿
        if (buyOrder.status == OrderStatus.FILLED) _removeFromActiveOrderBook(buyOrder.ticketId, buyOrderId);
        if (sellOrder.status == OrderStatus.FILLED) _removeFromActiveOrderBook(sellOrder.ticketId, sellOrderId);

        return _tradeIdCounter - 1;
    }

    // ==================== 手续费收集地址 ====================

    function setFeeCollector(address newFeeCollector) public {
        require(_auth.hasRole(_auth.EXCHANGE_ADMIN_ROLE(), msg.sender), "Only exchange admin");
        require(newFeeCollector != address(0), "Invalid address");
        feeCollector = newFeeCollector;
    }

    // ==================== 查询：锁定余额 ====================

    function getLockedFiat(address account) public view returns (uint256) {
        return _lockedFiat[account];
    }

    function getLockedTicket(address account, uint256 ticketId) public view returns (uint256) {
        return _lockedTicket[account][ticketId];
    }

    function getAvailableFiat(address account) public view returns (uint256) {
        uint256 total = _fiatToken.balanceOf(account);
        uint256 locked = _lockedFiat[account];
        return total > locked ? total - locked : 0;
    }

    function getAvailableTicket(address account, uint256 ticketId) public view returns (uint256) {
        uint256 total = _ticket.balanceOf(account, ticketId);
        uint256 locked = _lockedTicket[account][ticketId];
        return total > locked ? total - locked : 0;
    }

    // ==================== 查询：订单 ====================

    function getOrder(uint256 orderId) public view returns (Order memory) {
        return _orders[orderId];
    }

    function getTrade(uint256 tradeId) public view returns (Trade memory) {
        return _trades[tradeId];
    }

    function getAccountOrders(address account) public view returns (uint256[] memory) {
        return _accountOrders[account];
    }

    function getTicketOrderBook(uint256 ticketId) public view returns (uint256[] memory) {
        return _ticketOrderBook[ticketId];
    }

    function getActiveOrders(uint256 ticketId, OrderType orderType, uint256 limit)
        public view returns (Order[] memory)
    {
        uint256[] memory orderBook = _activeOrderBook[ticketId];
        Order[] memory temp = new Order[](orderBook.length);
        uint256 count = 0;

        for (uint256 i = 0; i < orderBook.length; i++) {
            Order storage o = _orders[orderBook[i]];
            if (o.orderType == orderType) temp[count++] = o;
        }

        uint256 resultSize = count < limit ? count : limit;

        // 排序：买单降序，卖单升序
        for (uint256 i = 0; i < count; i++) {
            for (uint256 j = i + 1; j < count; j++) {
                bool swap = orderType == OrderType.BUY
                    ? temp[i].price < temp[j].price
                    : temp[i].price > temp[j].price;
                if (swap) { Order memory t = temp[i]; temp[i] = temp[j]; temp[j] = t; }
            }
        }

        Order[] memory result = new Order[](resultSize);
        for (uint256 i = 0; i < resultSize; i++) result[i] = temp[i];
        return result;
    }

    function getBestPrices(uint256 ticketId)
        public view
        returns (uint256 bestBuyPrice, uint256 bestSellPrice, bool hasBuy, bool hasSell)
    {
        bestSellPrice = type(uint256).max;
        uint256[] memory orderBook = _activeOrderBook[ticketId];

        for (uint256 i = 0; i < orderBook.length; i++) {
            Order storage o = _orders[orderBook[i]];
            if (o.orderType == OrderType.BUY) {
                if (!hasBuy || o.price > bestBuyPrice) { bestBuyPrice = o.price; hasBuy = true; }
            } else {
                if (!hasSell || o.price < bestSellPrice) { bestSellPrice = o.price; hasSell = true; }
            }
        }
    }

    function getMarketDepth(uint256 ticketId, uint256 levels)
        public view
        returns (uint256[] memory buyPrices, uint256[] memory buyAmounts, uint256[] memory sellPrices, uint256[] memory sellAmounts)
    {
        uint256[] memory orderBook = _activeOrderBook[ticketId];
        uint256 n = orderBook.length;

        uint256[] memory bPrices  = new uint256[](n);
        uint256[] memory bAmounts = new uint256[](n);
        uint256[] memory sPrices  = new uint256[](n);
        uint256[] memory sAmounts = new uint256[](n);
        uint256 bc; uint256 sc;

        for (uint256 i = 0; i < n; i++) {
            Order storage o = _orders[orderBook[i]];
            uint256 remaining = o.amount - o.filledAmount;

            if (o.orderType == OrderType.BUY) {
                bool found;
                for (uint256 j = 0; j < bc; j++) {
                    if (bPrices[j] == o.price) { bAmounts[j] += remaining; found = true; break; }
                }
                if (!found) { bPrices[bc] = o.price; bAmounts[bc] = remaining; bc++; }
            } else {
                bool found;
                for (uint256 j = 0; j < sc; j++) {
                    if (sPrices[j] == o.price) { sAmounts[j] += remaining; found = true; break; }
                }
                if (!found) { sPrices[sc] = o.price; sAmounts[sc] = remaining; sc++; }
            }
        }

        // 排序
        for (uint256 i = 0; i < bc; i++)
            for (uint256 j = i + 1; j < bc; j++)
                if (bPrices[i] < bPrices[j]) {
                    (bPrices[i], bPrices[j]) = (bPrices[j], bPrices[i]);
                    (bAmounts[i], bAmounts[j]) = (bAmounts[j], bAmounts[i]);
                }

        for (uint256 i = 0; i < sc; i++)
            for (uint256 j = i + 1; j < sc; j++)
                if (sPrices[i] > sPrices[j]) {
                    (sPrices[i], sPrices[j]) = (sPrices[j], sPrices[i]);
                    (sAmounts[i], sAmounts[j]) = (sAmounts[j], sAmounts[i]);
                }

        uint256 bl = bc < levels ? bc : levels;
        uint256 sl = sc < levels ? sc : levels;

        buyPrices   = new uint256[](bl); buyAmounts  = new uint256[](bl);
        sellPrices  = new uint256[](sl); sellAmounts = new uint256[](sl);

        for (uint256 i = 0; i < bl; i++) { buyPrices[i]  = bPrices[i];  buyAmounts[i]  = bAmounts[i]; }
        for (uint256 i = 0; i < sl; i++) { sellPrices[i] = sPrices[i]; sellAmounts[i] = sAmounts[i]; }
    }

    function getAccountActiveOrders(address account) public view returns (Order[] memory) {
        uint256[] memory ids = _accountOrders[account];
        Order[] memory temp = new Order[](ids.length);
        uint256 count;
        for (uint256 i = 0; i < ids.length; i++) {
            Order storage o = _orders[ids[i]];
            if (o.status == OrderStatus.PENDING || o.status == OrderStatus.PARTIAL) temp[count++] = o;
        }
        Order[] memory result = new Order[](count);
        for (uint256 i = 0; i < count; i++) result[i] = temp[i];
        return result;
    }

    function getAccountTrades(address account, uint256 limit) public view returns (Trade[] memory) {
        uint256[] memory tradeIds = _accountTrades[account];
        uint256 resultSize = tradeIds.length < limit ? tradeIds.length : limit;
        Trade[] memory result = new Trade[](resultSize);

        // 从最新的开始返回（倒序）
        for (uint256 i = 0; i < resultSize; i++) {
            uint256 tradeId = tradeIds[tradeIds.length - 1 - i];
            result[i] = _trades[tradeId];
        }
        return result;
    }

    function getOrderStats(uint256 ticketId)
        public view
        returns (uint256 totalOrders, uint256 activeOrders, uint256 totalTrades, uint256 totalVolume)
    {
        totalOrders = _ticketOrderBook[ticketId].length;
        activeOrders = _activeOrderBook[ticketId].length;

        // 使用索引查询，避免全量扫描
        uint256[] memory tradeIds = _ticketTrades[ticketId];
        totalTrades = tradeIds.length;
        for (uint256 i = 0; i < tradeIds.length; i++) {
            totalVolume += _trades[tradeIds[i]].amount;
        }
    }
}
