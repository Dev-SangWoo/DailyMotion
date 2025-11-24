# Kubernetes 배포 가이드

이 디렉토리는 데일리모션 FastAPI 서버의 Kubernetes 배포 설정 파일들을 포함합니다.

## 📁 파일 구조

```
k8s/
├── deployment.yaml           # Deployment, Service, HPA 설정
├── secrets.yaml.example      # Secrets 템플릿 (실제 값은 secrets.yaml에)
└── README.md                 # 이 파일
```

## 🚀 배포 단계

### 1. Secrets 생성

먼저 `secrets.yaml.example`을 복사하여 실제 시크릿 파일을 생성합니다:

```bash
cp secrets.yaml.example secrets.yaml
```

그리고 실제 값으로 변경합니다 (base64 인코딩 필요):

```bash
# 예시: ODSAY API 키 인코딩
echo -n "your-actual-odsay-api-key" | base64
```

또는 kubectl 명령어로 직접 생성:

```bash
kubectl create secret generic dailymotion-secrets \
  --from-literal=database-url='postgresql://user:password@host:5432/dbname' \
  --from-literal=odsay-api-key='your-odsay-api-key' \
  --from-literal=secret-key='your-super-secret-key-minimum-32-chars'
```

### 2. Secrets 적용

```bash
kubectl apply -f secrets.yaml
```

### 3. Deployment 배포

```bash
kubectl apply -f deployment.yaml
```

### 4. 배포 확인

```bash
# Pod 상태 확인
kubectl get pods -l app=dailymotion-api

# Service 확인
kubectl get svc dailymotion-api-service

# Logs 확인
kubectl logs -f deployment/dailymotion-api

# HPA 상태 확인
kubectl get hpa dailymotion-api-hpa
```

## 🔍 Health Check 엔드포인트

- **Liveness Probe**: `GET /health`
  - 서버가 살아있는지 확인
  - 실패 시 컨테이너 재시작

- **Readiness Probe**: `GET /ready`
  - 트래픽을 받을 준비가 되었는지 확인
  - 실패 시 트래픽 전달 중단 (재시작 없음)

- **Metrics**: `GET /metrics`
  - Prometheus 메트릭 수집용 엔드포인트

## 📊 Auto Scaling

HPA (Horizontal Pod Autoscaler) 설정:
- **최소 레플리카**: 3
- **최대 레플리카**: 10
- **CPU 사용률**: 70%
- **메모리 사용률**: 80%

## 🔐 보안 고려사항

1. **Secrets 관리**
   - `secrets.yaml`은 절대 Git에 커밋하지 마세요
   - `.gitignore`에 추가되어 있는지 확인
   - 프로덕션에서는 NHN Cloud Key Manager 사용 권장

2. **네트워크 정책**
   - 필요 시 NetworkPolicy 추가
   - Ingress/Egress 규칙 설정

3. **RBAC**
   - ServiceAccount 생성
   - Role/RoleBinding 설정

## 🌐 NHN Cloud 배포

### NKS (NHN Kubernetes Service) 배포

1. **클러스터 생성**
   ```bash
   # NHN Cloud Console에서 NKS 클러스터 생성
   # 또는 CLI 사용
   ```

2. **kubeconfig 설정**
   ```bash
   nhn cloud config set --cluster your-cluster-name
   ```

3. **배포**
   ```bash
   kubectl apply -f k8s/
   ```

### LoadBalancer 설정

NHN Cloud에서는 Service type=LoadBalancer가 자동으로 NHN Cloud Load Balancer를 생성합니다.

```bash
# External IP 확인
kubectl get svc dailymotion-api-service
```

## 📝 환경별 배포

### Development

```bash
kubectl apply -f k8s/ --namespace=dev
```

### Staging

```bash
kubectl apply -f k8s/ --namespace=staging
```

### Production

```bash
kubectl apply -f k8s/ --namespace=production
```

## 🔄 Rolling Update

새 버전 배포:

```bash
# 이미지 업데이트
kubectl set image deployment/dailymotion-api \
  api=dailymotion-api:v1.1.0

# 또는 deployment.yaml 수정 후
kubectl apply -f deployment.yaml
```

롤백:

```bash
kubectl rollout undo deployment/dailymotion-api
```

## 📊 모니터링

### Logs 조회

```bash
# 실시간 로그
kubectl logs -f deployment/dailymotion-api

# 특정 Pod 로그
kubectl logs -f pod/dailymotion-api-xxxxx
```

### 메트릭 조회

```bash
# CPU/메모리 사용량
kubectl top pods -l app=dailymotion-api

# HPA 상태
kubectl get hpa dailymotion-api-hpa
```

## 🚨 트러블슈팅

### Pod가 시작되지 않을 때

```bash
# Pod 상태 확인
kubectl describe pod dailymotion-api-xxxxx

# 이벤트 확인
kubectl get events --sort-by=.metadata.creationTimestamp
```

### Readiness Probe 실패

```bash
# Pod 내부에서 직접 확인
kubectl exec -it dailymotion-api-xxxxx -- curl http://localhost:8000/ready
```

### Secret 문제

```bash
# Secret 확인
kubectl get secret dailymotion-secrets
kubectl describe secret dailymotion-secrets
```

## 📚 참고 자료

- [NHN Cloud NKS 문서](https://docs.nhncloud.com/ko/Container/NKS/ko/overview/)
- [Kubernetes 공식 문서](https://kubernetes.io/docs/home/)
- [FastAPI 배포 가이드](https://fastapi.tiangolo.com/deployment/)
