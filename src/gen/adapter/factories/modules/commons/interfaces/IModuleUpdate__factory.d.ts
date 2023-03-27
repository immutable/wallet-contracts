import { Signer } from "ethers";
import type { Provider } from "@ethersproject/providers";
import type { IModuleUpdate, IModuleUpdateInterface } from "../../../../modules/commons/interfaces/IModuleUpdate";
export declare class IModuleUpdate__factory {
    static readonly abi: readonly [{
        readonly inputs: readonly [{
            readonly internalType: "address";
            readonly name: "_implementation";
            readonly type: "address";
        }];
        readonly name: "updateImplementation";
        readonly outputs: readonly [];
        readonly stateMutability: "nonpayable";
        readonly type: "function";
    }];
    static createInterface(): IModuleUpdateInterface;
    static connect(address: string, signerOrProvider: Signer | Provider): IModuleUpdate;
}
