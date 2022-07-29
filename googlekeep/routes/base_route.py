from flask import Blueprint, render_template, g, redirect, url_for
from googlekeep.forms.auth_form import LoginForm

NAME = 'base'

bp = Blueprint(NAME, __name__)


@bp.route('/')
def index():
    if not g.user:
        return redirect(url_for('auth.login'))
    return render_template('index.html')


@bp.route('/<user_id>')
def my_page(user_id):
    form = LoginForm()
    user_id = form.data.get('user_id')
    return render_template('index.html', user_id=user_id)
