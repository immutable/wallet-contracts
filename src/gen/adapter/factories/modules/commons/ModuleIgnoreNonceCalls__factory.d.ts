import { Signer } from "ethers";
import type { Provider } from "@ethersproject/providers";
import type { ModuleIgnoreNonceCalls, ModuleIgnoreNonceCallsInterface } from "../../../modules/commons/ModuleIgnoreNonceCalls";
export declare class ModuleIgnoreNonceCalls__factory {
    static readonly abi: readonly [{
        readonly anonymous: false;
        readonly inputs: readonly [{
            readonly indexed: false;
            readonly internalType: "uint256";
            readonly name: "_space";
            readonly type: "uint256";
        }, {
            readonly indexed: false;
            readonly internalType: "uint256";
            readonly name: "_newNonce";
            readonly type: "uint256";
        }];
        readonly name: "NonceChange";
        readonly type: "event";
    }, {
        readonly anonymous: true;
        readonly inputs: readonly [{
            readonly indexed: false;
            readonly internalType: "bytes32";
            readonly name: "_tx";
            readonly type: "bytes32";
        }];
        readonly name: "TxExecuted";
        readonly type: "event";
    }, {
        readonly anonymous: false;
        readonly inputs: readonly [{
            readonly indexed: false;
            readonly internalType: "bytes32";
            readonly name: "_tx";
            readonly type: "bytes32";
        }, {
            readonly indexed: false;
            readonly internalType: "bytes";
            readonly name: "_reason";
            readonly type: "bytes";
        }];
        readonly name: "TxFailed";
        readonly type: "event";
    }, {
        readonly inputs: readonly [{
            readonly components: readonly [{
                readonly internalType: "bool";
                readonly name: "delegateCall";
                readonly type: "bool";
            }, {
                readonly internalType: "bool";
                readonly name: "revertOnError";
                readonly type: "bool";
            }, {
                readonly internalType: "uint256";
                readonly name: "gasLimit";
                readonly type: "uint256";
            }, {
                readonly internalType: "address";
                readonly name: "target";
                readonly type: "address";
            }, {
                readonly internalType: "uint256";
                readonly name: "value";
                readonly type: "uint256";
            }, {
                readonly internalType: "bytes";
                readonly name: "data";
                readonly type: "bytes";
            }];
            readonly internalType: "struct IModuleCalls.Transaction[]";
            readonly name: "_txs";
            readonly type: "tuple[]";
        }, {
            readonly internalType: "uint256";
            readonly name: "_nonce";
            readonly type: "uint256";
        }, {
            readonly internalType: "bytes";
            readonly name: "_signature";
            readonly type: "bytes";
        }];
        readonly name: "execute";
        readonly outputs: readonly [];
        readonly stateMutability: "nonpayable";
        readonly type: "function";
    }, {
        readonly inputs: readonly [];
        readonly name: "nonce";
        readonly outputs: readonly [{
            readonly internalType: "uint256";
            readonly name: "";
            readonly type: "uint256";
        }];
        readonly stateMutability: "view";
        readonly type: "function";
    }, {
        readonly inputs: readonly [{
            readonly internalType: "uint256";
            readonly name: "_space";
            readonly type: "uint256";
        }];
        readonly name: "readNonce";
        readonly outputs: readonly [{
            readonly internalType: "uint256";
            readonly name: "";
            readonly type: "uint256";
        }];
        readonly stateMutability: "view";
        readonly type: "function";
    }, {
        readonly inputs: readonly [{
            readonly components: readonly [{
                readonly internalType: "bool";
                readonly name: "delegateCall";
                readonly type: "bool";
            }, {
                readonly internalType: "bool";
                readonly name: "revertOnError";
                readonly type: "bool";
            }, {
                readonly internalType: "uint256";
                readonly name: "gasLimit";
                readonly type: "uint256";
            }, {
                readonly internalType: "address";
                readonly name: "target";
                readonly type: "address";
            }, {
                readonly internalType: "uint256";
                readonly name: "value";
                readonly type: "uint256";
            }, {
                readonly internalType: "bytes";
                readonly name: "data";
                readonly type: "bytes";
            }];
            readonly internalType: "struct IModuleCalls.Transaction[]";
            readonly name: "_txs";
            readonly type: "tuple[]";
        }];
        readonly name: "selfExecute";
        readonly outputs: readonly [];
        readonly stateMutability: "nonpayable";
        readonly type: "function";
    }, {
        readonly inputs: readonly [{
            readonly internalType: "bytes4";
            readonly name: "_interfaceID";
            readonly type: "bytes4";
        }];
        readonly name: "supportsInterface";
        readonly outputs: readonly [{
            readonly internalType: "bool";
            readonly name: "";
            readonly type: "bool";
        }];
        readonly stateMutability: "pure";
        readonly type: "function";
    }];
    static createInterface(): ModuleIgnoreNonceCallsInterface;
    static connect(address: string, signerOrProvider: Signer | Provider): ModuleIgnoreNonceCalls;
}
