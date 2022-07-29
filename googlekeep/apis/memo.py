import re
from googlekeep.apis.label import Label
from googlekeep.models.memo import Memo as MemoModel
from googlekeep.models.user import User as UserModel
from googlekeep.models.label import Label as LabelModel
from flask_restx import Namespace, fields, Resource, reqparse, inputs
from flask import g, current_app
from werkzeug.datastructures import FileStorage
from werkzeug.utils import secure_filename
import os
import shutil

ns = Namespace(
    'memos',
    description='메모 관련 API'
)

label = ns.model('Label', {
    'id': fields.Integer(required=True, description='라벨 고유 아이디'),
    'content': fields.String(required=True, description='라벨 내용')
})

memo = ns.model('Memo', {
    'id': fields.Integer(required=True, description='메모 고유 ID'),
    'user_id': fields.Integer(required=True, description='유저 고유 ID'),
    'title': fields.String(required=True, description='메모 제목'),
    'content': fields.String(required=True, description='메모 내용'),
    'linked_image': fields.String(required=False, description='메모 이미지 경로'),
    'is_deleted': fields.Boolean(description='메모 삭제 상태'),
    'liked': fields.Integer(description='메모 좋아요 수'),
    'labels': fields.List(fields.Nested(label), description='연결된 라벨'),
    'create_at': fields.DateTime(description='메모 작성일'),
    'updated_at': fields.DateTime(description='메모 수정일')
})

parser = reqparse.RequestParser()  # POST parser
parser.add_argument('title', required=True, help='메모 제목', location='form')
parser.add_argument('content', required=True, help='메모 내용', location='form')
parser.add_argument('linked_image', required=False,
                    type=FileStorage, help='메모 이미지', location='files')
parser.add_argument('is_deleted', required=False,
                    type=inputs.boolean, help='메모 삭제 상태', location='form')
parser.add_argument('labels', action='split',
                    help='라벨 내용 콤마 스트링', location='form')
parser.add_argument('liked', help='메모 좋아요 수', location='form')

put_parser = parser.copy()  # PUT parser(복사)
put_parser.replace_argument('title', required=False,
                            help='메모 제목', location='form')
put_parser.replace_argument(
    'content', required=False, help='메모 내용', location='form')
put_parser.replace_argument('liked', help='메모 좋아요 수', location='form')

get_parser = reqparse.RequestParser()  # GET parser
get_parser.add_argument('page', required=False, type=int,
                        help='메모 페이지 번호', location='args')
get_parser.add_argument('needle', required=False,
                        help='메모 검색어', location='args')
get_parser.add_argument('is_deleted', required=False,
                        type=inputs.boolean, help='메모 삭제 상태', location='args')
get_parser.add_argument('label', help='라벨 번호', location='args')
get_parser.add_argument('liked', help='메모 좋아요 수', location='args')


def allowed_file(filename):
    return '.' in filename and \
        filename.rsplit('.', 1)[1].lower() in {'png', 'jpg', 'jpeg', 'gif'}


def randomword(length):
    import random
    import string
    letters = string.ascii_lowercase
    return ''.join(random.choice(letters) for i in range(length))


def save_file(file):
    if file.filename == '':
        ns.abort(400)

    if file and allowed_file(file.filename):
        filename = secure_filename(file.filename)
        relative_path = os.path.join(
            current_app.static_url_path[1:],
            current_app.config['USER_STATIC_BASE_DIR'],
            g.user.user_id,
            'memos',
            randomword(5),
            filename
        )
        upload_path = os.path.join(
            current_app.root_path,
            relative_path
        )
        os.makedirs(
            os.path.dirname(upload_path),
            exist_ok=True
        )
        file.save(upload_path)
        return relative_path, upload_path
    else:
        ns.abort(400)

# /api/memos


@ns.route('')
class MemoList(Resource):
    @ns.marshal_list_with(memo, skip_none=True)
    @ns.expect(get_parser)
    def get(self):
        '''메모 복수 조회'''
        args = get_parser.parse_args()
        page = args['page']
        needle = args['needle']
        is_deleted = args['is_deleted']
        label = args['label']
        liked = args['liked']

        if is_deleted is None:
            is_deleted = False

        base_query = MemoModel.query.join(
            UserModel,
            # UserModel.id == MemoModel.user_id
        ).filter(
            # UserModel.id == g.user.id,
            MemoModel.is_deleted == is_deleted
        ).order_by(
            MemoModel.created_at.desc()
        )

        if needle:
            needle = f'%{needle}%'
            base_query = base_query.filter(
                MemoModel.title.ilike(needle) | MemoModel.content.ilike(needle)
            )

        if label:
            base_query = base_query.filter(
                MemoModel.labels.any(LabelModel.id == label)
            )

        pages = base_query.paginate(
            page=page,
            per_page=15
        )
        return pages.items

    @ns.marshal_list_with(memo, skip_none=True)
    @ns.expect(parser)
    def post(self):
        '''메모 생성'''
        args = parser.parse_args()
        memo = MemoModel(
            title=args['title'],
            content=args['content'],
            user_id=g.user.id
        )
        if args['is_deleted'] is not None:
            memo.is_deleted = args['is_deleted']
        file = args['linked_image']
        if file:
            relative_path, _ = save_file(file)
            memo.linked_image = relative_path

        labels = args['labels']
        if labels:
            for cnt in labels:
                if cnt:
                    label = LabelModel.query.filter(
                        LabelModel.content == cnt,
                        LabelModel.user_id == g.user.id
                    ).first()

                    if not label:
                        label = LabelModel(
                            content=cnt,
                            user_id=g.user.id
                        )
                    memo.labels.append(label)
        g.db.add(memo)
        g.db.commit()
        return memo, 201

# /api/memos/id


@ns.param('id', '메모 고유 ID')
@ns.route('/<int:id>')
class Memo(Resource):
    @ns.marshal_list_with(memo, skip_none=True)
    def get(self, id):
        '''메모 단수 조회'''
        memo = MemoModel.query.get_or_404(id)
        # if g.user.id != memo.user_id:
        #     ns.abort(403)
        return memo

    @ns.marshal_list_with(memo, skip_none=True)
    @ns.expect(put_parser)
    def put(self, id):
        '''메모 업데이트'''
        args = put_parser.parse_args()
        memo = MemoModel.query.get_or_404(id)
        if args['is_deleted'] is not None:
            if g.user.id != memo.user_id:
                ns.abort(403)
        if args['title'] is not None:
            memo.title = args['title']
        if args['content'] is not None:
            memo.content = args['content']
        if args['is_deleted'] is not None:
            memo.is_deleted = args['is_deleted']
        file = args['linked_image']
        if file:
            relative_path, upload_path = save_file(file)
            if memo.linked_image:
                origin_path = os.path.join(
                    current_app.root_path,
                    memo.linked_image
                )
                if origin_path != upload_path:
                    if os.path.isfile(origin_path):
                        shutil.rmtree(os.path.dirname(origin_path))
            memo.linked_image = relative_path
        labels = args['labels']
        if labels:
            memo.labels.clear()
            for cnt in labels:
                if cnt:
                    label = LabelModel.query.filter(
                        LabelModel.content == cnt,
                        LabelModel.user_id == g.user.id
                    ).first()
                    if not label:
                        label = LabelModel(
                            content=cnt,
                            user_id=g.user.id
                        )
                    memo.labels.append(label)
        g.db.commit()
        return memo

    def delete(self, id):
        '''메모 삭제'''
        memo = MemoModel.query.get_or_404(id)
        if g.user.id != memo.user_id:
            ns.abort(403)
        g.db.delete(memo)
        g.db.commit()
        return '', 204


@ns.param('id', '메모 고유 아이디')
@ns.route('/<int:id>/image')
class MemoImage(Resource):
    def delete(self, id):
        '''메모 이미지 삭제'''
        memo = MemoModel.query.get_or_404(id)
        if g.user.id != memo.user_id:
            ns.abort(403)
        if memo.linked_image:
            origin_path = os.path.join(
                current_app.root_path,
                memo.linked_image
            )
            if os.path.isfile(origin_path):
                shutil.rmtree(os.path.dirname(origin_path))
            memo.linked_image = None
            g.db.commit()
            return '', 204
