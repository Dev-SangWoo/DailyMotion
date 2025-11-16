from openai import OpenAI
import os

# 환경변수 OPENAI_API_KEY 사용
client = OpenAI(api_key=os.getenv("OPENAI_API_KEY"))

resp = client.chat.completions.create(
    model="gpt-4o-mini",
    messages=[
        {"role": "system", "content": "You are a helpful coding assistant."},
        {"role": "user", "content": "NestJS로 /health 엔드포인트 컨트롤러 스캐폴드 생성"}
    ],
    temperature=0.2,
)

print(resp.choices[0].message.content)
