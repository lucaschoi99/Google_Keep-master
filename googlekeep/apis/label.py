from flask import g
from flask_restx import Namespace, fields, reqparse, Resource
from googlekeep.models.label import Label as LabelModel
from googlekeep.models.user import User as UserModel

ns = Namespace(
  'labels',
  description='라벨 관련 API'
)

label = ns.model('Label', {
  'id': fields.Integer(required=True, description='라벨 고유 아이디'),
  'user_id': fields.Integer(required=True, description='라벨 작성자 유저 고유 아이디'),
  'content': fields.String(required=True, description='라벨 내용'),
  'created_at': fields.DateTime(description='라벨 생성일')
})

parser = reqparse.RequestParser() # POST parser
parser.add_argument('content', required=True, type=str, help='라벨 내용', location='form')

# /api/labels
@ns.route('')
class LabelList(Resource):

  @ns.marshal_list_with(label, skip_none=True)
  def get(self):
    '''라벨 복수 조회'''
    query = LabelModel.query.join(
      UserModel,
      # UserModel.id == LabelModel.user_id
    ).filter(
      # UserModel.id == g.user.id
    )
    return query.all()
  
  @ns.marshal_list_with(label, skip_none=True)
  @ns.expect(parser)
  def post(self):
    '''라벨 생성'''
    args = parser.parse_args()
    content = args['content']
    # label = LabelModel.query.join(
    #   UserModel,
    #   UserModel.id == LabelModel.user_id
    # ).filter(
    #   UserModel.id == g.user.id,
    #   LabelModel.content == content # 중복되는 데이터 체크
    # ).first()

    # if label: # 중복되는 데이터가 존재하면 오류 발생
    #   ns.abort(409)

    label = LabelModel(
      content=content,
      user_id=1
    )

    g.db.add(label)
    g.db.commit()

    return label, 201

@ns.param('id', '라벨 고유 아이디')
@ns.route('/<int:id>')
class Label(Resource):

  def delete(self, id):
    '''라벨 삭제'''
    label = LabelModel.query.get_or_404(id)
    if label.user_id != g.user.id:
      ns.abort(403)

    g.db.delete(label)
    g.db.commit()
    return '', 204
