import { adoGetJson } from './http';
import type { CurrentUser } from './pr-types';

interface ConnectionData {
    authenticatedUser?: {
        id: string;
        providerDisplayName?: string;
        customDisplayName?: string;
        imageUrl?: string;
    };
}

/** Fetch the signed-in user via the org-level connectionData endpoint. */
export async function fetchCurrentUser(organizationUrl: string): Promise<CurrentUser | null> {
    const data = await adoGetJson<ConnectionData>(
        `${organizationUrl}/_apis/connectionData?api-version=7.1`,
    );
    const user = data.authenticatedUser;
    if (!user) {
        return null;
    }
    return {
        id: user.id,
        displayName: user.providerDisplayName ?? user.customDisplayName ?? '',
        imageUrl: user.imageUrl,
    };
}
