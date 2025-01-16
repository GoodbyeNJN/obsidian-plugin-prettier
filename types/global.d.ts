type SetRequired<BaseType, Keys extends keyof BaseType> = BaseType &
    Omit<BaseType, Keys> &
    Required<Pick<BaseType, Keys>>;

interface MapWith<K, V, DefiniteKey extends K> extends Map<K, V> {
    get: (k: DefiniteKey) => V;
    get: (k: K) => V | undefined;
}

declare global {
    class ObjectConstructor {
        keys<T = {}>(o: T): (keyof T)[];

        entries<T = Record<string, unknown>>(o: T): [keyof T, T[keyof T]][];

        fromEntries<T = any>(entries: [keyof T, T[keyof T]][]): T;

        /**
         * Determines whether an object has a property with the specified name.
         * @param o An object.
         * @param v A property name.
         */
        hasOwn<T, K extends keyof T>(o: T, v: K): o is SetRequired<T, K>;
        hasOwn<K extends PropertyKey>(o: object, v: K): o is { [K in K]: unknown };
    }

    interface Map<K, V> {
        // eslint-disable-next-line @typescript-eslint/method-signature-style
        has<CheckedString extends string>(
            this: Map<string, V>,
            key: CheckedString,
        ): this is MapWith<K, V, CheckedString>;
    }

    interface Manifest {
        id: string;
        name: string;
        version: string;
        author: string;
        authorUrl: string;
        description: string;
        isDesktopOnly: boolean;
        minAppVersion: string;
    }
}

export {};
