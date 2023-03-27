import { Signer } from "ethers";
import type { Provider } from "@ethersproject/providers";
import type { IERC223Receiver, IERC223ReceiverInterface } from "../../../interfaces/receivers/IERC223Receiver";
export declare class IERC223Receiver__factory {
    static readonly abi: readonly [{
        readonly inputs: readonly [{
            readonly internalType: "address";
            readonly name: "";
            readonly type: "address";
        }, {
            readonly internalType: "uint256";
            readonly name: "";
            readonly type: "uint256";
        }, {
            readonly internalType: "bytes";
            readonly name: "";
            readonly type: "bytes";
        }];
        readonly name: "tokenFallback";
        readonly outputs: readonly [];
        readonly stateMutability: "nonpayable";
        readonly type: "function";
    }];
    static createInterface(): IERC223ReceiverInterface;
    static connect(address: string, signerOrProvider: Signer | Provider): IERC223Receiver;
}
