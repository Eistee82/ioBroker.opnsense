/** Central definition of all ioBroker state objects used by this adapter. */
export interface StateDefinition {
    type: ioBroker.CommonType;
    role: string;
    name: string;
    read: boolean;
    write: boolean;
    unit?: string;
    def?: ioBroker.StateValue;
}
export declare const systemStates: Record<string, StateDefinition>;
export declare const gatewayStates: Record<string, StateDefinition>;
export declare const interfaceStates: Record<string, StateDefinition>;
export declare const interfaceTrafficStates: Record<string, StateDefinition>;
export declare const interfaceStatisticsStates: Record<string, StateDefinition>;
export declare const serviceStates: Record<string, StateDefinition>;
export declare const arpStates: Record<string, StateDefinition>;
export declare const infoStates: Record<string, StateDefinition>;
//# sourceMappingURL=state-definitions.d.ts.map