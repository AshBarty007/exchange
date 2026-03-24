// SPDX-License-Identifier: MIT
pragma solidity ^0.8.0;

interface IExchange {
    enum OrderStatus { PENDING, PARTIAL, FILLED, CANCELLED }
    enum OrderType   { BUY, SELL }

    struct Order {
        uint256 orderId;
        address account;
        OrderType orderType;
        uint256 ticketId;
        uint256 price;
        uint256 amount;
        uint256 filledAmount;
        OrderStatus status;
        uint256 createdAt;
        uint256 expiry;
        bytes32 orderHash;
        bytes signature;
    }

    struct Trade {
        uint256 tradeId;
        uint256 buyOrderId;
        uint256 sellOrderId;
        address buyer;
        address seller;
        uint256 ticketId;
        uint256 price;
        uint256 amount;
        uint256 fee;
        uint256 timestamp;
        bytes32 tradeHash;
    }

    function createOrder(
        address subAccount,
        OrderType orderType,
        uint256 ticketId,
        uint256 price,
        uint256 amount,
        uint256 expiry,
        bytes memory mainAccountSignature
    ) external returns (uint256);

    function cancelOrder(uint256 orderId, uint256 expiry, bytes memory mainAccountSignature) external returns (bool);
    function getOrder(uint256 orderId) external view returns (Order memory);
    function getAccountOrders(address account) external view returns (uint256[] memory);
    function getTicketOrderBook(uint256 ticketId) external view returns (uint256[] memory);
}
