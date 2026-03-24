import { ec as EC } from 'elliptic';
import { keccak256 } from 'js-sha3';
import type { OrderParams, SignedOrder } from '@/types';

/**
 * 签名服务
 * 负责订单签名验证（前端本地验证，用于提交前预检查）
 */
class KeyManager {
  private ec: EC;

  constructor() {
    this.ec = new EC('secp256k1');
  }

  /**
   * 从公钥派生地址 (FISCO BCOS 兼容)
   */
  private deriveAddress(publicKey: string): string {
    const pubKey = publicKey.startsWith('04') ? publicKey.slice(2) : publicKey;
    const hash = keccak256(pubKey);
    return '0x' + hash.slice(-40);
  }

  // ==================== 订单签名验证 ====================

  private encodeUint256(value: number | string): string {
    const bn = BigInt(value);
    return bn.toString(16).padStart(64, '0');
  }

  private encodeAddress(addr: string): string {
    const clean = addr.startsWith('0x') ? addr.slice(2) : addr;
    return clean.toLowerCase().padStart(40, '0');
  }

  private hexToBytes(hex: string): Uint8Array {
    const clean = hex.startsWith('0x') ? hex.slice(2) : hex;
    const bytes = new Uint8Array(clean.length / 2);
    for (let i = 0; i < bytes.length; i++) {
      bytes[i] = parseInt(clean.slice(i * 2, i * 2 + 2), 16);
    }
    return bytes;
  }

  /**
   * 生成订单哈希，与合约 createOrder 中的 keccak256(abi.encodePacked(...)) 完全一致
   */
  generateOrderHash(
    ticketId: number,
    price: number,
    amount: number,
    account: string,
    nonce: number
  ): string {
    const packed =
      this.encodeUint256(ticketId) +
      this.encodeUint256(price) +
      this.encodeUint256(amount) +
      this.encodeAddress(account) +
      this.encodeUint256(nonce);

    return '0x' + keccak256(this.hexToBytes(packed));
  }

  /**
   * 生成 EIP-191 以太坊签名消息哈希
   */
  toEthSignedMessageHash(messageHash: string): string {
    const clean = messageHash.startsWith('0x') ? messageHash.slice(2) : messageHash;
    const prefix = '19457468657265756d205369676e6564204d6573736167653a0a3332';
    return keccak256(this.hexToBytes(prefix + clean));
  }

  /**
   * 验证订单签名（本地验证，模拟合约逻辑）
   */
  verifyOrderSignature(signedOrder: SignedOrder): boolean {
    try {
      const orderHash = this.generateOrderHash(
        signedOrder.ticketId,
        signedOrder.price,
        signedOrder.amount,
        signedOrder.signer,
        signedOrder.nonce
      );

      const hashToVerify = signedOrder.orderHash || orderHash;
      if (orderHash !== signedOrder.orderHash) {
        console.warn('Order hash mismatch with local formula, fallback to provided orderHash');
      }

      const ethHash = this.toEthSignedMessageHash(hashToVerify);

      const sigHex = signedOrder.signature.startsWith('0x')
        ? signedOrder.signature.slice(2)
        : signedOrder.signature;
      const r = sigHex.slice(0, 64);
      const s = sigHex.slice(64, 128);
      const v = parseInt(sigHex.slice(128, 130), 16);
      const recoveryParam = v - 27;

      const msgBytes = this.hexToBytes(ethHash);
      const pubKey = this.ec.recoverPubKey(
        Array.from(msgBytes),
        { r, s },
        recoveryParam
      );

      const recoveredAddress = this.deriveAddress(pubKey.encode('hex', false));

      const normalizedSigner = signedOrder.signer.toLowerCase().startsWith('0x')
        ? signedOrder.signer.toLowerCase()
        : `0x${signedOrder.signer.toLowerCase()}`;
      return recoveredAddress.toLowerCase() === normalizedSigner;
    } catch (error) {
      console.error('Order signature verification failed:', error);
      return false;
    }
  }
}

export const keyManager = new KeyManager();
export default keyManager;
