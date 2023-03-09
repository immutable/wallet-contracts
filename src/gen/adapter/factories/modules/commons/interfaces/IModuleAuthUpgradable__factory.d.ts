import { Signer } from "ethers";
import type { Provider } from "@ethersproject/providers";
import type { IModuleAuthUpgradable, IModuleAuthUpgradableInterface } from "../../../../modules/commons/interfaces/IModuleAuthUpgradable";
export declare class IModuleAuthUpgradable__factory {
    static readonly abi: readonly [{
        readonly inputs: readonly [];
        readonly name: "imageHash";
        readonly outputs: readonly [{
            readonly internalType: "bytes32";
            readonly name: "";
            readonly type: "bytes32";
        }];
        readonly stateMutability: "view";
        readonly type: "function";
    }, {
        readonly inputs: readonly [{
            readonly internalType: "bytes32";
            readonly name: "_imageHash";
            readonly type: "bytes32";
        }];
        readonly name: "updateImageHash";
        readonly outputs: readonly [];
        readonly stateMutability: "nonpayable";
        readonly type: "function";
    }];
    static createInterface(): IModuleAuthUpgradableInterface;
    static connect(address: string, signerOrProvider: Signer | Provider): IModuleAuthUpgradable;
}
