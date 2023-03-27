import { Signer } from "ethers";
import type { Provider } from "@ethersproject/providers";
import type { IModuleHooks, IModuleHooksInterface } from "../../../../modules/commons/interfaces/IModuleHooks";
export declare class IModuleHooks__factory {
    static readonly abi: readonly [{
        readonly inputs: readonly [{
            readonly internalType: "bytes4";
            readonly name: "_signature";
            readonly type: "bytes4";
        }, {
            readonly internalType: "address";
            readonly name: "_implementation";
            readonly type: "address";
        }];
        readonly name: "addHook";
        readonly outputs: readonly [];
        readonly stateMutability: "nonpayable";
        readonly type: "function";
    }, {
        readonly inputs: readonly [{
            readonly internalType: "bytes4";
            readonly name: "_signature";
            readonly type: "bytes4";
        }];
        readonly name: "readHook";
        readonly outputs: readonly [{
            readonly internalType: "address";
            readonly name: "";
            readonly type: "address";
        }];
        readonly stateMutability: "view";
        readonly type: "function";
    }, {
        readonly inputs: readonly [{
            readonly internalType: "bytes4";
            readonly name: "_signature";
            readonly type: "bytes4";
        }];
        readonly name: "removeHook";
        readonly outputs: readonly [];
        readonly stateMutability: "nonpayable";
        readonly type: "function";
    }];
    static createInterface(): IModuleHooksInterface;
    static connect(address: string, signerOrProvider: Signer | Provider): IModuleHooks;
}
