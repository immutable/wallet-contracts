import type { BaseContract, BigNumber, BigNumberish, BytesLike, CallOverrides, PopulatedTransaction, Signer, utils } from "ethers";
import type { FunctionFragment, Result, EventFragment } from "@ethersproject/abi";
import type { Listener, Provider } from "@ethersproject/providers";
import type { TypedEventFilter, TypedEvent, TypedListener, OnEvent, PromiseOrValue } from "./common";
export interface ProxyInterface extends utils.Interface {
    functions: {
        "PROXY_getImplementation()": FunctionFragment;
    };
    getFunction(nameOrSignatureOrTopic: "PROXY_getImplementation"): FunctionFragment;
    encodeFunctionData(functionFragment: "PROXY_getImplementation", values?: undefined): string;
    decodeFunctionResult(functionFragment: "PROXY_getImplementation", data: BytesLike): Result;
    events: {
        "Received(uint256,address,bytes)": EventFragment;
    };
    getEvent(nameOrSignatureOrTopic: "Received"): EventFragment;
}
export interface ReceivedEventObject {
    value: BigNumber;
    sender: string;
    data: string;
}
export type ReceivedEvent = TypedEvent<[
    BigNumber,
    string,
    string
], ReceivedEventObject>;
export type ReceivedEventFilter = TypedEventFilter<ReceivedEvent>;
export interface Proxy extends BaseContract {
    connect(signerOrProvider: Signer | Provider | string): this;
    attach(addressOrName: string): this;
    deployed(): Promise<this>;
    interface: ProxyInterface;
    queryFilter<TEvent extends TypedEvent>(event: TypedEventFilter<TEvent>, fromBlockOrBlockhash?: string | number | undefined, toBlock?: string | number | undefined): Promise<Array<TEvent>>;
    listeners<TEvent extends TypedEvent>(eventFilter?: TypedEventFilter<TEvent>): Array<TypedListener<TEvent>>;
    listeners(eventName?: string): Array<Listener>;
    removeAllListeners<TEvent extends TypedEvent>(eventFilter: TypedEventFilter<TEvent>): this;
    removeAllListeners(eventName?: string): this;
    off: OnEvent<this>;
    on: OnEvent<this>;
    once: OnEvent<this>;
    removeListener: OnEvent<this>;
    functions: {
        PROXY_getImplementation(overrides?: CallOverrides): Promise<[string] & {
            implementation: string;
        }>;
    };
    PROXY_getImplementation(overrides?: CallOverrides): Promise<string>;
    callStatic: {
        PROXY_getImplementation(overrides?: CallOverrides): Promise<string>;
    };
    filters: {
        "Received(uint256,address,bytes)"(value?: PromiseOrValue<BigNumberish> | null, sender?: PromiseOrValue<string> | null, data?: null): ReceivedEventFilter;
        Received(value?: PromiseOrValue<BigNumberish> | null, sender?: PromiseOrValue<string> | null, data?: null): ReceivedEventFilter;
    };
    estimateGas: {
        PROXY_getImplementation(overrides?: CallOverrides): Promise<BigNumber>;
    };
    populateTransaction: {
        PROXY_getImplementation(overrides?: CallOverrides): Promise<PopulatedTransaction>;
    };
}
