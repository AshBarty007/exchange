// SPDX-License-Identifier: MIT
pragma solidity ^0.8.0;

interface IAuth {
    function hasRole(bytes32 role, address account) external view returns (bool);
    function isFrozen(address account) external view returns (bool);
    function isAnyAdmin(address account) external view returns (bool);

    function ADMIN_ROLE() external view returns (bytes32);
    function REGULATOR_ROLE() external view returns (bytes32);
    function BANK_ROLE() external view returns (bytes32);
    function EXCHANGE_ADMIN_ROLE() external view returns (bytes32);
    function SCENIC_OPERATOR_ROLE() external view returns (bytes32);
    function MARKET_MAKER_ROLE() external view returns (bytes32);
    function CONSUMER_ROLE() external view returns (bytes32);
}
