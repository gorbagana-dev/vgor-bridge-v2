'use client';

import { FC, useMemo } from 'react';
import { ConnectionProvider, WalletProvider } from '@solana/wallet-adapter-react';

import {
    WalletModalProvider
} from '@solana/wallet-adapter-react-ui';

// Default styles that can be overridden by your app
import '@solana/wallet-adapter-react-ui/styles.css';

const Providers: FC<{ children: React.ReactNode }> = ({ children }) => {
    // You can also provide a custom RPC endpoint.
    const endpoint = 'https://mainnet.helius-rpc.com/?api-key=8ff87f94-5a19-45e5-b9ff-51d35fb0a02f';

    const wallets = useMemo(
        () => [],
        []
    );

    return (
        <ConnectionProvider endpoint={endpoint}>
            <WalletProvider wallets={wallets} autoConnect>
                <WalletModalProvider>
                    {children}
                </WalletModalProvider>
            </WalletProvider>
        </ConnectionProvider>
    );
};

export default Providers;
