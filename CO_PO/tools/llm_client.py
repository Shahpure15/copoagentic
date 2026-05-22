from groq import Groq
import os
import json
from dotenv import load_dotenv

load_dotenv()

_client = Groq(api_key=os.getenv("GROQ_API_KEY"))


def call_llm(
    prompt: str,
    system: str = "",
    temperature: float = 0.2,
    expect_json: bool = True
):

    messages = []

    if system:
        messages.append({
            "role": "system",
            "content": system
        })

    messages.append({
        "role": "user",
        "content": prompt
    })

    response = _client.chat.completions.create(
        model="llama-3.3-70b-versatile",
        messages=messages,
        temperature=temperature,
    )

    raw = response.choices[0].message.content.strip()

    if expect_json:
        raw = raw.replace("```json", "")
        raw = raw.replace("```", "")
        raw = raw.strip()

    return raw


def call_llm_json(prompt: str, system: str = ""):

    raw = call_llm(
        prompt=prompt,
        system=system,
        expect_json=True
    )

    try:
        return json.loads(raw)

    except json.JSONDecodeError as e:

        print("\n⚠ Invalid JSON detected")
        print("━━━━━━━━━━━━━━━━━━━━━━━━━━━━")
        print(e)

        print("\n📦 RAW RESPONSE:")
        print("━━━━━━━━━━━━━━━━━━━━━━━━━━━━")
        print(raw)

        repair_prompt = f"""
Convert the following into VALID JSON ONLY.

Do not add explanations.
Do not add markdown.

DATA:
{raw}
"""

        repaired = call_llm(
            prompt=repair_prompt,
            system="Return ONLY valid JSON.",
            expect_json=False,
            temperature=0
        )

        repaired = repaired.replace("```json", "")
        repaired = repaired.replace("```", "")
        repaired = repaired.strip()

        try:
            return json.loads(repaired)

        except Exception:
            print("\n❌ JSON repair failed")
            return {}