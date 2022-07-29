#!/bin/bash

set -e # 에러

flask db upgrade

# gunicorn 실행(8080 포트 바인딩) # --access-logfile: HTTP request 등이 전달되면 Docker Container 로그 노출
# gunicorn --bind :8080 --workers 2 --threads 8 --access-logfile - 'googlekeep:create_app()'

# gunicorn 실행(tmp/gunicorn/sock 을 만들어서 통신) # --reload: 수정사항이 발생했을 때 reload(Graceful)
gunicorn --bind unix:/tmp/gunicorn.sock --workers 2 --threads 8 --reload --access-logfile - 'googlekeep:create_app()'