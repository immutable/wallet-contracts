import { Signer } from "ethers";
import type { Provider } from "@ethersproject/providers";
import type { ModuleERC165, ModuleERC165Interface } from "../../../modules/commons/ModuleERC165";
export declare class ModuleERC165__factory {
    static readonly abi: readonly [{
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
    static createInterface(): ModuleERC165Interface;
    static connect(address: string, signerOrProvider: Signer | Provider): ModuleERC165;
}
