export interface StatusUpdate {

    personId: number;
    personLabel?: string;
    groupId?: number;
    groupLabel?: string;
    personStatus?: string;
    testId?: number;
    bookletName?: string;
    testState: {
        [testStateKey: string]: string
    };
    unitName?: string;
    unitState: {
        [unitStateKey: string]: string
    };
    timestamp: number;
}
