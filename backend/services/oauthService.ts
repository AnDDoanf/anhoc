import crypto from "node:crypto";

export interface OAuthProfile {
  id: string;
  email: string;
  name: string;
  avatarUrl?: string;
}

export const getGoogleAuthUrl = (redirectUri: string, state: string): string => {
  const rootUrl = "https://accounts.google.com/o/oauth2/v2/auth";
  const options = {
    redirect_uri: redirectUri,
    client_id: process.env.GOOGLE_CLIENT_ID || "",
    access_type: "offline",
    response_type: "code",
    prompt: "consent",
    scope: "openid email profile",
    state,
  };
  const qs = new URLSearchParams(options).toString();
  return `${rootUrl}?${qs}`;
};

export const getGoogleProfile = async (code: string, redirectUri: string): Promise<OAuthProfile> => {
  if (process.env.GOOGLE_CLIENT_ID === "your_google_client_id" || code.startsWith("mock_")) {
    return {
      id: "mock-google-id-12345",
      email: "mock.user@gmail.com",
      name: "Mock Google User",
      avatarUrl: "https://lh3.googleusercontent.com/a/mock-avatar",
    };
  }

  const tokenUrl = "https://oauth2.googleapis.com/token";
  const values = {
    code,
    client_id: process.env.GOOGLE_CLIENT_ID || "",
    client_secret: process.env.GOOGLE_CLIENT_SECRET || "",
    redirect_uri: redirectUri,
    grant_type: "authorization_code",
  };
  
  const tokenResponse = await fetch(tokenUrl, {
    method: "POST",
    headers: { "Content-Type": "application/x-www-form-urlencoded" },
    body: new URLSearchParams(values).toString(),
  });
  
  if (!tokenResponse.ok) {
    const errorText = await tokenResponse.text();
    throw new Error(`Failed to exchange Google OAuth code: ${errorText}`);
  }
  
  const { access_token } = await tokenResponse.json() as { access_token: string };
  
  const userinfoResponse = await fetch("https://www.googleapis.com/oauth2/v3/userinfo", {
    headers: { Authorization: `Bearer ${access_token}` },
  });
  
  if (!userinfoResponse.ok) {
    throw new Error("Failed to fetch Google user profile info");
  }
  
  const profile = await userinfoResponse.json() as {
    sub: string;
    email: string;
    name: string;
    picture?: string;
  };
  
  return {
    id: profile.sub,
    email: profile.email,
    name: profile.name,
    avatarUrl: profile.picture,
  };
};

export const getFacebookAuthUrl = (redirectUri: string, state: string): string => {
  const rootUrl = "https://www.facebook.com/v18.0/dialog/oauth";
  const options = {
    client_id: process.env.FACEBOOK_CLIENT_ID || "",
    redirect_uri: redirectUri,
    scope: "email,public_profile",
    state,
  };
  const qs = new URLSearchParams(options).toString();
  return `${rootUrl}?${qs}`;
};

export const getFacebookProfile = async (code: string, redirectUri: string): Promise<OAuthProfile> => {
  if (process.env.FACEBOOK_CLIENT_ID === "your_facebook_client_id" || code.startsWith("mock_")) {
    return {
      id: "mock-facebook-id-12345",
      email: "mock.user.facebook@example.com",
      name: "Mock Facebook User",
      avatarUrl: "https://graph.facebook.com/mock-avatar",
    };
  }

  const tokenUrl = "https://graph.facebook.com/v18.0/oauth/access_token";
  const params = {
    client_id: process.env.FACEBOOK_CLIENT_ID || "",
    client_secret: process.env.FACEBOOK_CLIENT_SECRET || "",
    redirect_uri: redirectUri,
    code,
  };
  
  const tokenResponse = await fetch(`${tokenUrl}?${new URLSearchParams(params).toString()}`);
  
  if (!tokenResponse.ok) {
    const errorText = await tokenResponse.text();
    throw new Error(`Failed to exchange Facebook OAuth code: ${errorText}`);
  }
  
  const { access_token } = await tokenResponse.json() as { access_token: string };
  
  const userinfoResponse = await fetch(
    `https://graph.facebook.com/me?fields=id,name,email,picture.width(250).height(250)&access_token=${access_token}`
  );
  
  if (!userinfoResponse.ok) {
    throw new Error("Failed to fetch Facebook user profile info");
  }
  
  const profile = await userinfoResponse.json() as {
    id: string;
    name: string;
    email?: string;
    picture?: {
      data?: {
        url?: string;
      };
    };
  };
  
  if (!profile.email) {
    throw new Error("Email permission was not granted by Facebook user");
  }
  
  return {
    id: profile.id,
    email: profile.email,
    name: profile.name,
    avatarUrl: profile.picture?.data?.url,
  };
};

export const getMicrosoftAuthUrl = (redirectUri: string, state: string): string => {
  const rootUrl = "https://login.microsoftonline.com/common/oauth2/v2.0/authorize";
  const options = {
    client_id: process.env.MICROSOFT_CLIENT_ID || "",
    redirect_uri: redirectUri,
    response_type: "code",
    response_mode: "query",
    scope: "openid email profile User.Read",
    state,
  };
  const qs = new URLSearchParams(options).toString();
  return `${rootUrl}?${qs}`;
};

export const getMicrosoftProfile = async (code: string, redirectUri: string): Promise<OAuthProfile> => {
  if (process.env.MICROSOFT_CLIENT_ID === "your_microsoft_client_id" || code.startsWith("mock_")) {
    return {
      id: "mock-microsoft-id-12345",
      email: "mock.user.outlook@outlook.com",
      name: "Mock Outlook User",
    };
  }

  const tokenUrl = "https://login.microsoftonline.com/common/oauth2/v2.0/token";
  const values = {
    client_id: process.env.MICROSOFT_CLIENT_ID || "",
    client_secret: process.env.MICROSOFT_CLIENT_SECRET || "",
    code,
    redirect_uri: redirectUri,
    grant_type: "authorization_code",
  };
  
  const tokenResponse = await fetch(tokenUrl, {
    method: "POST",
    headers: { "Content-Type": "application/x-www-form-urlencoded" },
    body: new URLSearchParams(values).toString(),
  });
  
  if (!tokenResponse.ok) {
    const errorText = await tokenResponse.text();
    throw new Error(`Failed to exchange Microsoft OAuth code: ${errorText}`);
  }
  
  const { access_token } = await tokenResponse.json() as { access_token: string };
  
  const userinfoResponse = await fetch("https://graph.microsoft.com/v1.0/me", {
    headers: { Authorization: `Bearer ${access_token}` },
  });
  
  if (!userinfoResponse.ok) {
    throw new Error("Failed to fetch Microsoft Graph user profile info");
  }
  
  const profile = await userinfoResponse.json() as {
    id: string;
    displayName: string;
    mail?: string;
    userPrincipalName?: string;
  };
  
  const email = profile.mail || profile.userPrincipalName || "";
  if (!email) {
    throw new Error("Could not retrieve email address from Microsoft user profile");
  }
  
  return {
    id: profile.id,
    email,
    name: profile.displayName || email.split("@")[0] || "User",
  };
};
