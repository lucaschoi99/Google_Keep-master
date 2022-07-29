# Docker hub에서 python 3.8 Image를 써서 Container를 띄워준다(Base Image)
FROM python:3.8

# root 권한
# 유저 추가, 패스워드 입력 필요 X, 홈 디렉토리 자동 생성
RUN adduser --disabled-password python

# 위에서 생성한 python 유저로 전환 (root -> python)
USER python

# 의존성 패키지 복사(requirements.txt -> Docker Image내의 tmp 경로의 requirements.txt)
COPY ./requirements.txt /tmp/requirements.txt

# 의존성 패키지 설치
# python user로 설치, python 의존성 패키지들은 홈 디렉토리에 위치
RUN pip install --user -r /tmp/requirements.txt
RUN pip install --user gunicorn==20.1.0

# 프로젝트 복사(Owner와 Owner Group을 python(user)으로 바꾼다) -> 현재 위치에 있는 모든 파일을 Docker Image안의 www/googlekeep 경로로 복사한다
COPY --chown=python:python ./ /var/www/googlekeep

# 복사한 프로젝트 경로로 이동
WORKDIR /var/www/googlekeep

# 설치한 패키지 명령어를 사용하기 위해 환경변수 등록
ENV PATH="/home/python/.local/bin:${PATH}"

# entrypoint shell 실행 권한
RUN chmod +x ./etc/docker-entrypoint.sh

# 8080 포트 노출
EXPOSE 8080

# ENTRYPOINT ./etc/docker-entrypoint.sh

# gunicorn 실행(8080 포트 바인딩)
# CMD gunicorn --bind :8080 --workers 2 --threads 8 'googlekeep:create_app()'