// SPDX-License-Identifier: MIT
pragma solidity ^0.8.0;

interface IAccount {
    struct AccountInfo {
        uint8 accountType; // 0=NONE, 1=MAIN, 2=SUB
        address mainAccount;
        address[] subAccounts;
        bytes32 role;
        uint256 createdAt;
        bool active;
        string metadata;
    }

    function isSubAccount(address account) external view returns (bool);
    function isMainAccount(address account) external view returns (bool);
    function isActive(address account) external view returns (bool);
    function getMainAccount(address account) external view returns (address);
    function getSubAccounts(address mainAccount) external view returns (address[] memory);
    function getAccountInfo(address account) external view returns (AccountInfo memory);
    function getAccountRole(address account) external view returns (bytes32);
    function verifySubAccountOwnership(address subAccount, address mainAccount) external view returns (bool);
    function registerMainAccount(address account, bytes32 role, string memory metadata) external returns (bool);
    function createSubAccount(address mainAccount, string memory metadata) external returns (address);
}
