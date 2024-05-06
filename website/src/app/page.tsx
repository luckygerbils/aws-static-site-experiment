"use client";

import { useState } from 'react';
import { UserInfo } from '@/components/UserInfo'
import { cognitoUserPool } from '@/userPool';
import { callJson } from '@/api';

export default function Home() {
  const [ { value: callResult, error, pending }, setCallResult ] = useState<{error?: Error, value?: string, pending?: boolean}>({});

  async function callLambda() {
    try {
      setCallResult({ pending: true });
      const result = await callJson({ 
        operation: "PutPlanting",
        plantingId: "abcdefg",
        planting: {
          name: "Some Planting"
        }
       })
      setCallResult({
        value: JSON.stringify(result, null, " ")
      });
    } catch (error) {
      setCallResult({ error: error instanceof Error ? error : new Error(`${error}`) });
    }
  }

  function logOut() {
    cognitoUserPool()?.getCurrentUser()?.signOut(() => location.assign("/login/"));
  }
  
  return (
    <main className="flex min-h-screen flex-col items-center justify-between p-24">
      <UserInfo />

      <button onClick={callLambda} disabled={pending}>Call Lambda</button>
      <button onClick={logOut}>Log Out</button>

      {error &&
        <pre className="text-wrap break-all">
          {error.message}
        </pre>}
      {callResult && 
        <pre className="text-wrap break-all">
          {callResult}
        </pre>}
    </main>
  );
}
