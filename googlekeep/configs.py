import os
BASE_PATH = os.path.dirname(os.path.abspath(__file__))

class Config(object):
  '''Flask Config'''
  SECRET_KEY = 'secretkey'
  SESSION_COOKIE_NAME = 'googlekeep'
  SQLALCHEMY_DATABASE_URI = 'mysql+pymysql://root:password@localhost/googlekeep?charset=utf8'
  SQLALCHEMY_TRACK_MODIFICATIONS = False
  SWAGGER_UI_DOC_EXPANSION = 'list'
  USER_STATIC_BASE_DIR = 'user_images'

  def __init__(self): # config.py가 initialize 될 때 
    db_env = os.environ.get('SQLALCHEMY_DATABASE_URI') # .env 파일에서 정의한 URI가 docker-compose 파일의 환경변수로 정의되고, Python Application에서 환경변수로 전달
    if db_env: # 정의가 되어 있다면
      self.SQLALCHEMY_DATABASE_URI = db_env # SQLALCHEMY_DATABASE_URI를 .env 파일에서 init된 값으로 치환

class DevelopmentConfig(Config):
  '''Flask Config for Dev'''
  DEBUG = True
  SEND_FILE_MAX_AGE_DEFAULT = 1
  # TODO: 프론트 호출시 처리
  WTF_CSRF_ENABLED = False

class TestingConfig(DevelopmentConfig):
  __test__ = False
  TESTING = True
  SQLALCHEMY_DATABASE_URI = f'sqlite:///{os.path.join(BASE_PATH, "sqlite_test.db")}'  

class ProductionConfig(Config):
  pass