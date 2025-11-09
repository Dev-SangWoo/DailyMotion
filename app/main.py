from fastapi import FastAPI
import uvicorn

app = FastAPI()

@app.get("/")
def read_root():
    return {"message": "Hello Daily Motion! Server is running!"}

@app.get("/health")
def health_check():
    return {"status": "ok"}

if __name__ == "__main__":
    # 로컬에서 직접 실행할 때를 위한 코드 (서버에서는 uvicorn 명령어로 실행하는 것이 정석)
    uvicorn.run("main:app", host="0.0.0.0", port=8000, reload=True)