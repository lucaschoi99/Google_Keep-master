from flask import Flask, g, render_template
from flask_wtf.csrf import CSRFProtect
from flask_sqlalchemy import SQLAlchemy
from flask_migrate import Migrate

csrf = CSRFProtect()
db = SQLAlchemy()
migrate = Migrate()

def create_app(config=None): # create_app()을 자동으로 Flask가 실행시키고, __init__.py를 통해서 디렉토리가 모듈화됐기 때문에 googlekeep을 python 파일로 인식
  app = Flask(__name__)

  '''Flask Configs'''
  from .configs import DevelopmentConfig, ProductionConfig
  if not config:
    if app.config['DEBUG']:
      config = DevelopmentConfig()
    else:
      config = ProductionConfig()
    
  app.config.from_object(config)

  '''CSRF INIT'''
  csrf.init_app(app)

  '''DB INIT'''
  db.init_app(app)
  if app.config['SQLALCHEMY_DATABASE_URI'].startswith('sqlite'):
    migrate.init_app(app, db, render_as_batch=True)
  else:
    migrate.init_app(app, db)

  '''RESTX INIT'''
  from googlekeep.apis import blueprint as api
  app.register_blueprint(api) 

  '''Routes INIT'''
  from googlekeep.routes import base_route, auth_route
  app.register_blueprint(base_route.bp)
  app.register_blueprint(auth_route.bp)

  '''REQUSET HOOK'''
  @app.before_request
  def before_request():
    g.db = db.session
  
  @app.teardown_request
  def teardown_request(exception):
    if hasattr(g, 'db'):
      g.db.close()

  @app.errorhandler(404)
  def page_404(error):
    return render_template('/404.html'), 404

  return app