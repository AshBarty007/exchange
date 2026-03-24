"""
FISCO BCOS 区块链交互工具
"""
import requests
from typing import Dict, List, Any
import json

class FiscoBcosClient:
    """FISCO BCOS 客户端封装"""

    def __init__(self, node_url: str, chain_id: int = 1, group_id: int = 1):
        self.node_url = node_url
        self.chain_id = chain_id
        self.group_id = group_id
        self.request_id = 0

    def _make_request(self, method: str, params: List[Any]) -> Dict:
        """发送JSON-RPC请求"""
        self.request_id += 1

        payload = {
            "jsonrpc": "2.0",
            "method": method,
            "params": params,
            "id": self.request_id
        }

        response = requests.post(self.node_url, json=payload)
        return response.json()

    def get_block_number(self) -> int:
        """获取最新区块号"""
        result = self._make_request("getBlockNumber", [self.group_id])
        return int(result['result'], 16)

    def get_block_by_number(self, block_number: int) -> Dict:
        """获取区块信息"""
        result = self._make_request("getBlockByNumber", [
            self.group_id,
            hex(block_number),
            True
        ])
        return result['result']

    def call_contract(self, contract_address: str, function_signature: str, params: List[Any]) -> Any:
        """调用合约方法（只读）"""
        result = self._make_request("call", [
            self.group_id,
            {
                "to": contract_address,
                "data": self._encode_function_call(function_signature, params)
            }
        ])
        return result['result']

    def send_transaction(self, contract_address: str, function_signature: str, params: List[Any]) -> str:
        """发送交易"""
        result = self._make_request("sendRawTransaction", [
            self.group_id,
            {
                "to": contract_address,
                "data": self._encode_function_call(function_signature, params)
            }
        ])
        return result['result']

    def get_transaction_receipt(self, tx_hash: str) -> Dict:
        """获取交易回执"""
        result = self._make_request("getTransactionReceipt", [
            self.group_id,
            tx_hash
        ])
        return result['result']

    def _encode_function_call(self, function_signature: str, params: List[Any]) -> str:
        """编码函数调用（简化版，实际应使用ABI编码）"""
        # 这里需要使用完整的ABI编码库
        # 示例仅作演示
        return "0x" + function_signature


class ContractHelper:
    """智能合约辅助类"""

    def __init__(self, client: FiscoBcosClient):
        self.client = client

    def batch_mint_tickets(
        self,
        nft_contract: str,
        ticket_type: str,
        price: int,
        valid_until: int,
        count: int
    ) -> str:
        """批量铸造门票"""
        return self.client.send_transaction(
            nft_contract,
            "batchMint",
            [ticket_type, price, valid_until, count]
        )

    def mint_asset_token(
        self,
        token_contract: str,
        proof_id: str
    ) -> str:
        """基于存款证明铸造资金凭证"""
        return self.client.send_transaction(
            token_contract,
            "mintWithProof",
            [proof_id]
        )

    def batch_settle(
        self,
        custody_contract: str,
        buyers: List[str],
        sellers: List[str],
        asset_token: str,
        amounts: List[int],
        nft_contract: str,
        token_ids: List[int]
    ) -> str:
        """批量清算"""
        return self.client.send_transaction(
            custody_contract,
            "batchSettle",
            [buyers, sellers, asset_token, amounts, nft_contract, token_ids]
        )

    def get_token_balance(self, token_contract: str, address: str) -> int:
        """查询代币余额"""
        result = self.client.call_contract(
            token_contract,
            "balanceOf",
            [address]
        )
        return int(result, 16)

    def get_nft_tokens(self, nft_contract: str, owner: str) -> List[int]:
        """查询NFT持有"""
        result = self.client.call_contract(
            nft_contract,
            "getOwnerTokens",
            [owner]
        )
        # 解析返回的token ID列表
        return []  # 需要实现ABI解码
