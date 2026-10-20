"""One small OpenAI chat call shared by the coach and the money wrap. Returns None when the AI is unavailable."""

import json
import os
import urllib.error
import urllib.request

OPENAI_URL = "https://api.openai.com/v1/chat/completions"


def chat(system, user, max_tokens=220, temperature=0.4, timeout=20):
    key = os.environ.get("OPENAI_API_KEY")
    if not key:
        return None
    body = json.dumps(
        {
            "model": os.environ.get("OPENAI_MODEL", "gpt-4o-mini"),
            "messages": [
                {"role": "system", "content": system},
                {"role": "user", "content": user},
            ],
            "max_tokens": max_tokens,
            "temperature": temperature,
        }
    ).encode()
    request = urllib.request.Request(
        OPENAI_URL,
        data=body,
        headers={"Authorization": f"Bearer {key}", "Content-Type": "application/json"},
    )
    try:
        with urllib.request.urlopen(request, timeout=timeout) as response:
            payload = json.loads(response.read())
        return payload["choices"][0]["message"]["content"].strip() or None
    except (urllib.error.URLError, TimeoutError, KeyError, IndexError, ValueError):
        return None
