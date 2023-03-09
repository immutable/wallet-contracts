import { Signer } from "ethers";
import type { Provider } from "@ethersproject/providers";
import type { IModuleCreator, IModuleCreatorInterface } from "../../../../modules/commons/interfaces/IModuleCreator";
export declare class IModuleCreator__factory {
    static readonly abi: readonly [{
        readonly inputs: readonly [{
            readonly internalType: "bytes";
            readonly name: "_code";
            readonly type: "bytes";
        }];
        readonly name: "createContract";
        readonly outputs: readonly [{
            readonly internalType: "address";
            readonly name: "addr";
            readonly type: "address";
        }];
        readonly stateMutability: "payable";
        readonly type: "function";
    }];
    static createInterface(): IModuleCreatorInterface;
    static connect(address: string, signerOrProvider: Signer | Provider): IModuleCreator;
}
