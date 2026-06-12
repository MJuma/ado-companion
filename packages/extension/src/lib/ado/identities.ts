import { adoGetJson, adoSendJson } from './http';
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
        `${organizationUrl}/_apis/connectionData?api-version=7.1-preview`,
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

export interface MentionCandidate {
    /** Local identity GUID, used to build the `@<id>` mention. */
    id: string;
    displayName: string;
    mail?: string;
    imageUrl?: string;
}

interface IdentityPickerIdentity {
    localId?: string | null;
    displayName?: string;
    mail?: string;
    signInAddress?: string;
}

interface IdentityPickerResponse {
    results?: { identities?: IdentityPickerIdentity[] }[];
}

/**
 * Search org identities for the @mention autocomplete via the IdentityPicker
 * endpoint (same-origin to ADO). Only identities with a local GUID — the ones
 * that can actually be mentioned — are returned.
 */
export async function searchIdentities(
    organizationUrl: string,
    query: string,
): Promise<MentionCandidate[]> {
    const trimmed = query.trim();
    if (trimmed.length === 0) {
        return [];
    }
    const body = {
        query: trimmed,
        identityTypes: ['user'],
        operationScopes: ['ims', 'source'],
        properties: ['DisplayName', 'Mail', 'SignInAddress', 'Active'],
        options: { MinResults: 5, MaxResults: 10 },
    };
    const response = await adoSendJson<IdentityPickerResponse>(
        'POST',
        `${organizationUrl}/_apis/IdentityPicker/Identities?api-version=5.0-preview.1`,
        body,
    );
    const identities = response.results?.[0]?.identities ?? [];
    const candidates: MentionCandidate[] = [];
    for (const identity of identities) {
        if (identity.localId && identity.displayName) {
            candidates.push({
                id: identity.localId,
                displayName: identity.displayName,
                mail: identity.mail ?? identity.signInAddress,
                // ADO's IdentityPicker no longer returns an image field; the legacy
                // org-scoped identity image endpoint resolves an avatar from the GUID.
                imageUrl: `${organizationUrl}/_api/_common/identityImage?id=${identity.localId}`,
            });
        }
    }
    return candidates;
}
