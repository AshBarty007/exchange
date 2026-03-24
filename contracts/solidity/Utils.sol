// SPDX-License-Identifier: MIT
pragma solidity ^0.8.0;

/**
 * @title Utils
 * @dev 通用工具合约,提供签名验证、地址校验、数值计算等基础功能
 * @notice 这是系统的基础层合约,被所有其他合约依赖
 */
library Utils {

    /**
     * @dev 签名验证失败错误
     */
    error InvalidSignature();

    /**
     * @dev 无效地址错误
     */
    error InvalidAddress();

    /**
     * @dev nonce已使用错误
     */
    error NonceAlreadyUsed();

    /**
     * @dev 签名已过期错误
     */
    error SignatureExpired();

    /**
     * @dev 验证地址是否有效
     * @param addr 待验证的地址
     * @return 地址是否有效
     */
    function isValidAddress(address addr) internal pure returns (bool) {
        return addr != address(0);
    }

    /**
     * @dev 要求地址有效,否则回滚
     * @param addr 待验证的地址
     */
    function requireValidAddress(address addr) internal pure {
        if (!isValidAddress(addr)) {
            revert InvalidAddress();
        }
    }

    /**
     * @dev 验证多个地址是否都有效
     * @param addresses 待验证的地址数组
     * @return 所有地址是否都有效
     */
    function areValidAddresses(address[] memory addresses) internal pure returns (bool) {
        for (uint256 i = 0; i < addresses.length; i++) {
            if (!isValidAddress(addresses[i])) {
                return false;
            }
        }
        return true;
    }

    /**
     * @dev 从消息哈希和签名中恢复签名者地址
     * @param messageHash 消息哈希
     * @param signature 签名(65字节: r(32) + s(32) + v(1))
     * @return 签名者地址
     */
    function recoverSigner(bytes32 messageHash, bytes memory signature)
        internal
        pure
        returns (address)
    {
        if (signature.length != 65) {
            revert InvalidSignature();
        }

        bytes32 r;
        bytes32 s;
        uint8 v;

        assembly {
            r := mload(add(signature, 32))
            s := mload(add(signature, 64))
            v := byte(0, mload(add(signature, 96)))
        }

        // EIP-2098: 紧凑签名支持
        if (v < 27) {
            v += 27;
        }

        if (v != 27 && v != 28) {
            revert InvalidSignature();
        }

        // 使用 ecrecover 恢复签名者地址
        address signer = ecrecover(messageHash, v, r, s);

        if (signer == address(0)) {
            revert InvalidSignature();
        }

        return signer;
    }

    /**
     * @dev 验证签名是否由指定地址签署
     * @param messageHash 消息哈希
     * @param signature 签名
     * @param expectedSigner 期望的签名者地址
     * @return 签名是否有效
     */
    function verifySignature(
        bytes32 messageHash,
        bytes memory signature,
        address expectedSigner
    ) internal pure returns (bool) {
        requireValidAddress(expectedSigner);
        address recoveredSigner = recoverSigner(messageHash, signature);
        return recoveredSigner == expectedSigner;
    }

    /**
     * @dev 构造EIP-712消息哈希
     * @param domainSeparator 域分隔符
     * @param structHash 结构化数据哈希
     * @return EIP-712消息哈希
     */
    function toTypedDataHash(bytes32 domainSeparator, bytes32 structHash)
        internal
        pure
        returns (bytes32)
    {
        return keccak256(abi.encodePacked("\x19\x01", domainSeparator, structHash));
    }

    /**
     * @dev 生成以太坊签名消息哈希
     * @param messageHash 原始消息哈希
     * @return 以太坊签名消息哈希
     */
    function toEthSignedMessageHash(bytes32 messageHash) internal pure returns (bytes32) {
        return keccak256(abi.encodePacked("\x19Ethereum Signed Message:\n32", messageHash));
    }

    /**
     * @dev 安全的加法,防止溢出(Solidity 0.8+已内置检查)
     * @param a 加数
     * @param b 加数
     * @return 和
     */
    function safeAdd(uint256 a, uint256 b) internal pure returns (uint256) {
        return a + b; // Solidity 0.8+ 自动检查溢出
    }

    /**
     * @dev 安全的减法,防止下溢(Solidity 0.8+已内置检查)
     * @param a 被减数
     * @param b 减数
     * @return 差
     */
    function safeSub(uint256 a, uint256 b) internal pure returns (uint256) {
        return a - b; // Solidity 0.8+ 自动检查下溢
    }

    /**
     * @dev 安全的乘法,防止溢出(Solidity 0.8+已内置检查)
     * @param a 乘数
     * @param b 乘数
     * @return 积
     */
    function safeMul(uint256 a, uint256 b) internal pure returns (uint256) {
        return a * b; // Solidity 0.8+ 自动检查溢出
    }

    /**
     * @dev 安全的除法,防止除零
     * @param a 被除数
     * @param b 除数
     * @return 商
     */
    function safeDiv(uint256 a, uint256 b) internal pure returns (uint256) {
        require(b > 0, "Division by zero");
        return a / b;
    }

    /**
     * @dev 计算百分比
     * @param amount 基数
     * @param percentage 百分比(basis points, 1% = 100)
     * @return 百分比对应的数值
     */
    function calculatePercentage(uint256 amount, uint256 percentage)
        internal
        pure
        returns (uint256)
    {
        return safeMul(amount, percentage) / 10000;
    }

    /**
     * @dev 生成订单哈希
     * @param ticketId 门票ID
     * @param price 价格
     * @param amount 数量
     * @param account 账户地址
     * @param nonce 防重放nonce
     * @param expiry 过期时间
     * @return 订单哈希
     */
    function generateOrderHash(
        uint256 ticketId,
        uint256 price,
        uint256 amount,
        address account,
        uint256 nonce,
        uint256 expiry
    ) internal pure returns (bytes32) {
        return keccak256(
            abi.encodePacked(
                ticketId,
                price,
                amount,
                account,
                nonce,
                expiry
            )
        );
    }

    /**
     * @dev 验证订单签名和时效性
     * @param orderHash 订单哈希
     * @param signature 签名
     * @param expectedSigner 期望的签名者
     * @param expiry 过期时间戳
     * @return 签名是否有效且未过期
     */
    function verifyOrderSignature(
        bytes32 orderHash,
        bytes memory signature,
        address expectedSigner,
        uint256 expiry
    ) internal view returns (bool) {
        // 检查是否过期
        if (block.timestamp > expiry) {
            revert SignatureExpired();
        }

        // 验证签名
        bytes32 ethSignedHash = toEthSignedMessageHash(orderHash);
        return verifySignature(ethSignedHash, signature, expectedSigner);
    }

    /**
     * @dev 字节数组转换为bytes32
     * @param source 源字节数组
     * @param offset 偏移量
     * @return result bytes32结果
     */
    function bytesToBytes32(bytes memory source, uint256 offset)
        internal
        pure
        returns (bytes32 result)
    {
        require(source.length >= offset + 32, "Invalid byte array length");

        assembly {
            result := mload(add(add(source, 32), offset))
        }
    }

    /**
     * @dev 检查时间戳是否在有效范围内
     * @param timestamp 待检查的时间戳
     * @param validFrom 有效开始时间
     * @param validUntil 有效结束时间
     * @return 时间戳是否有效
     */
    function isTimestampValid(
        uint256 timestamp,
        uint256 validFrom,
        uint256 validUntil
    ) internal pure returns (bool) {
        return timestamp >= validFrom && timestamp <= validUntil;
    }

    /**
     * @dev 获取当前区块时间戳
     * @return 当前区块时间戳
     */
    function getCurrentTimestamp() internal view returns (uint256) {
        return block.timestamp;
    }

    /**
     * @dev 生成唯一ID
     * @param seed 种子值
     * @param nonce nonce值
     * @return 唯一ID
     */
    function generateUniqueId(uint256 seed, uint256 nonce)
        internal
        view
        returns (bytes32)
    {
        return keccak256(
            abi.encodePacked(
                seed,
                nonce,
                block.timestamp,
                block.number,
                msg.sender
            )
        );
    }
}

/**
 * @title NonceManager
 * @dev Nonce管理合约,防止重放攻击
 */
contract NonceManager {

    /**
     * @dev 每个地址的nonce映射
     */
    mapping(address => uint256) private _nonces;

    /**
     * @dev 已使用的nonce集合(地址 => nonce => 是否已使用)
     */
    mapping(address => mapping(uint256 => bool)) private _usedNonces;

    /**
     * @dev Nonce已使用事件
     */
    event NonceUsed(address indexed account, uint256 nonce);

    /**
     * @dev 获取账户的当前nonce
     * @param account 账户地址
     * @return 当前nonce
     */
    function getNonce(address account) public view returns (uint256) {
        return _nonces[account];
    }

    /**
     * @dev 检查nonce是否已被使用
     * @param account 账户地址
     * @param nonce 待检查的nonce
     * @return nonce是否已被使用
     */
    function isNonceUsed(address account, uint256 nonce) public view returns (bool) {
        return _usedNonces[account][nonce];
    }

    /**
     * @dev 使用并递增nonce
     * @param account 账户地址
     * @return 使用前的nonce值
     */
    function _useNonce(address account) internal returns (uint256) {
        uint256 currentNonce = _nonces[account];
        _nonces[account]++;
        _usedNonces[account][currentNonce] = true;
        emit NonceUsed(account, currentNonce);
        return currentNonce;
    }

    /**
     * @dev 验证并使用指定的nonce
     * @param account 账户地址
     * @param nonce 待使用的nonce
     */
    function _verifyAndUseNonce(address account, uint256 nonce) internal {
        if (isNonceUsed(account, nonce)) {
            revert Utils.NonceAlreadyUsed();
        }

        _usedNonces[account][nonce] = true;

        // 如果nonce是按顺序的,更新计数器
        if (nonce == _nonces[account]) {
            _nonces[account]++;
        }

        emit NonceUsed(account, nonce);
    }

    /**
     * @dev 批量检查nonce是否已被使用
     * @param account 账户地址
     * @param nonces 待检查的nonce数组
     * @return 每个nonce是否已被使用
     */
    function areNoncesUsed(address account, uint256[] memory nonces)
        public
        view
        returns (bool[] memory)
    {
        bool[] memory results = new bool[](nonces.length);
        for (uint256 i = 0; i < nonces.length; i++) {
            results[i] = _usedNonces[account][nonces[i]];
        }
        return results;
    }
}
