/*Init Masonry*/
$CONTAINER = $("#container");
const $GRID = $CONTAINER.masonry({
  // 아이템
  itemSelector: ".item",
  columnWidth: ".sizer",
  percentPosition: true,
  // 좌우여백, 상하여백은 CSS로 해줘야 함
  gutter: 15,
  // 순서대로 배치
  horizontalOrder: true,
  // CSS로 정의해줘야 버그가 없음, 두번 리로드 되는 현상
  transitionDuration: 0,
});

/*MEMO*/
const MEMO = (function () {
  // 추가 조회 상태
  // 더 조회할 데이터 없음 = false
  let STATUS = true;
  // 조회 페이지
  let PAGE = 0;
  // 검색어
  let NEEDLE = null;
  // 삭제된 메모 검색 여부
  // true = 삭제된 메모, false = 삭제되지 않은 메모
  let IS_DELETED = false;
  // 조회할 라벨
  let LABEL = null;
  // 라벨 데이터 메모리에 저장
  let MEMORY_LABELS = [];
  // 좋아요 수
  let LIKED = 0;

  /* 셀럭터 */
  const $modalEdit = $("#modalEdit");
  const $modalTitle = $modalEdit.find(".modal-title");
  const $modalContent = $modalEdit.find(".modal-content");
  const $modalClose = $modalEdit.find(".modal-close");
  const $modalMedia = $modalEdit.find(".modal-media");
  const $modalFile = $modalEdit.find(".modal-file");
  const $modalModified = $modalEdit.find(".modal-modified");
  const $content = $("#content");
  const $layout = $(".mdl-layout__content");
  const $customActions = $("#customActions");
  // const $modalLikes = $();

  /* 검색 파라미터 */
  const _getParams = function () {
    return {
      status: STATUS,
      page: PAGE,
      needle: NEEDLE,
      label: LABEL,
      is_deleted: IS_DELETED,
      liked: LIKED,
    };
  };

  /* 모든 메모 제거 시, 그리드 비우기 */
  const _removeAllMemos = function () {
    const elems = $GRID.masonry("getItemElements");
    $GRID.masonry("remove", elems);
  };

  /*그리드 다시 재적용*/
  const _resetGridLayout = function () {
    const imageLength = $CONTAINER.find("img").length;
    if (imageLength >= 1) {
      $GRID.imagesLoaded().progress(function () {
        $GRID.masonry("layout"); // masonry의 layout을 호출해서 그리드 refresh
      });
    } else {
      $GRID.masonry("layout");
    }
    if (typeof componentHandler != "undefined") {
      // NOTE: MDL 컴포넌트 재활성화
      // 동적생성된 MDL 컴포넌트들이 정상 동작 안 할 경우가 있기 때문
      componentHandler.upgradeDom();
    }
  };

  /* 편집 팝업 필드 초기화 */
  const resetModalFields = function (resetLayout) {
    $modalTitle.val("");
    $modalContent.val("");
    $modalFile.val("");
    $modalMedia.html("");
    $modalClose.removeAttr("data-id");
    $modalContent.trigger("keyup");
    $modalModified.val(0);
    if (resetLayout) {
      _resetGridLayout();
    }
  };

  /* 메뉴 라벨 li 태그 생성 */
  const _makeLabelMenuHtml = function (el) {
    let labelHtml = "";
    labelHtml +=
      '<li class="item-label-li" onclick="event.stopPropagation();">';
    labelHtml +=
      '<label><input type="checkbox" value="' +
      el.content +
      '">' +
      el.content +
      "</label>";
    labelHtml += "</li>";
    return labelHtml;
  };

  /* 사이즈 바 메뉴 button 태그 생성 */
  const _makeLabelBtnHtml = function (el) {
    let labelHtml = "";
    labelHtml +=
      '<button class="sidemenu-btn mdl-button mdl-js-button" onclick="MEMO.getMemosByLabel(' +
      el.id +
      ')">';
    labelHtml += '<span class="sidemenu-icon material-icons-outlined">';
    labelHtml += "emoji_nature";
    labelHtml += "</span>";
    labelHtml += '<span class="sidemenu-title">';
    labelHtml += el.content;
    labelHtml +=
      '<span class="sidemenu-label-del-btn material-icons" onclick="MEMO.deleteLabel(event, ' +
      el.id +
      ')">';
    labelHtml += "clear";
    labelHtml += "</span>";
    labelHtml += "</span>";
    labelHtml += "</button>";
    return labelHtml;
  };

  /* 라벨 칩 span 태그 생성 */
  const _makeLabelChipHtml = function (el) {
    let labelHtml = "";
    $.each(el.labels, function (_, label) {
      labelHtml += '<span class="mdl-chip" data-label-id=' + label.id + ">";
      labelHtml += '<span class="mdl-chip__text">' + label.content + "</span>";
      labelHtml += "</span>";
    });
    return labelHtml;
  };

  /* 가운데 메모 컨텐츠 태그 생성 */
  const _makeMemoHtml = function (el) {
    let itemHtml = "";
    itemHtml +=
      '<div id="item' +
      el.id +
      '" class="item mdl-card" data-id="' +
      el.id +
      '">';
    itemHtml += '<div class="modal-run mdl-card__title">';
    itemHtml +=
      '<h2 class="item-title mdl-card__title-text">' + el.title + "</h2>";
    itemHtml += "</div>";
    itemHtml += '<div class="item-media modal-run mdl-card__media">';
    if (el.linked_image)
      itemHtml += '<img src="' + el.linked_image + '" alt=""/>';
    itemHtml += "</div>";
    itemHtml +=
      '<div class="item-content modal-run mdl-card__supporting-text">';
    itemHtml += el.content;
    itemHtml += "</div>";
    itemHtml += '<div class="item-chip modal-run">';
    itemHtml += _makeLabelChipHtml(el);
    itemHtml += "</div>";
    itemHtml += '<div class="mdl-card__actions mdl-card--border">';
    itemHtml +=
      '<button id="itemLabelBtn' +
      el.id +
      '" class="mdl-button mdl-button--icon mdl-js-button mdl-js-ripple-effect" onclick="MEMO.getLabelsForMenu(event, ' +
      el.id +
      ');">';
    itemHtml += '<i class="material-icons-outlined">label</i>';
    itemHtml += "</button>";
    itemHtml +=
      '<ul class="item-labels mdl-menu mdl-menu--top-left mdl-js-menu mdl-js-ripple-effect" data-mdl-for="itemLabelBtn' +
      el.id +
      '">';
    itemHtml +=
      '<li class="mdl-menu__item" onclick="MEMO.attachLabels(' +
      el.id +
      ');"><b>저장</b></li>';
    itemHtml += '<li class="mdl-menu__item" onclick="">닫기</li>';
    itemHtml += "</ul>";
    itemHtml +=
      '<button class="mdl-button mdl-button--icon mdl-js-button mdl-js-ripple-effect" onclick="MEMO.detachImage(event, ' +
      el.id +
      ');">';
    itemHtml += '<i class="material-icons-outlined">layers_clear</i>';
    itemHtml += "</button>";


    // ------- 좋아요 ------- //
    itemHtml +=
      '<button id="itemLabelBtn' +
      el.id +
      '" class="mdl-button mdl-js-button mdl-js-ripple-effect" onclick="MEMO.thumbsCount(event, ' +
      el.id +
      ');">';
    itemHtml += '<i class="material-icons-outlined">👍</i>';
    itemHtml += "</button>";
    itemHtml += "</div>";
    // ------------- //


    itemHtml += '<div class="mdl-card__menu">';
    if (IS_DELETED) {
      itemHtml +=
        '<button class="mdl-button mdl-button--icon mdl-js-button mdl-js-ripple-effect" onclick="MEMO.reviveMemo(event, ' +
        el.id +
        ')">';
      itemHtml += '<i class="material-icons-outlined">undo</i>';
      itemHtml += "</button>";
    } else {
      itemHtml +=
        '<button class="mdl-button mdl-button--icon mdl-js-button mdl-js-ripple-effect" onclick="MEMO.deleteMemo(event, ' +
        el.id +
        ')">';
      itemHtml += '<i class="material-icons-outlined">clear</i>';
      itemHtml += "</button>";
    }
    itemHtml += "</div>";
    itemHtml += "</div>";
    return itemHtml;
  };

  /*추가 데이터 없음 아이템 태그*/
  const _makeNoMoreItemHtml = function () {
    let html = "";
    html += '<div class="item item-full">';
    html += '<span class="sidemenu-icon material-icons-outlined">';
    html += "info";
    html += "<span> 추가 로드할 데이터 없음</span>";
    html += "</span>";
    html += "</div>";
    return html;
  };

  /*추가 데이터 로드 아이템 태그*/
  const _makeMoreItemHtml = function () {
    let html = "";
    html += '<div class="item item-full" onclick="MEMO.getMemos(this);">';
    html += '<span class="sidemenu-icon material-icons-outlined">';
    html += "hourglass_top";
    html += "<span> 추가 로드하기</span>";
    html += "</span>";
    html += "</div>";
    return html;
  };

  /* 메모 생성 */
  const createMemo = function () {
    /* POST /api/memos */

    const form = $modalEdit[0];
    const data = new FormData(form);
    let submitFlag = false;
    for (var [key, value] of data.entries()) {
      if (key == "title" || key == "content") {
        if (value) submitFlag = true;
      }
    }
    if (submitFlag) {
      $.ajax({
        url: "/api/memos", // 엔드포인트
        type: "post", // METHOD
        data: data, // 자동으로 FormData에 담긴다
        enctype: "multipart/form-data",
        processData: false, // The automatic conversion of data to strings is prevented
        contentType: false, // default 값으로 사용하지 않고, multipart/form-data (enctype) 처리 위해서 false 처리
        // 모든 문자를 인코딩하지 않음을 명시 -> <form> 요소가 파일이나 이미지를 서버로 전송할 떄 주로 사용
        success: (r) => {
          // 성공적으로 값을 서버로 보낸 경우
          let itemHtml = _makeMemoHtml(r); // 조회한 메모 데이터 동적으로 HTML 생성
          $items = $(itemHtml); // prepend Method를 사용하기 위해서
          $GRID.prepend($items).masonry("prepended", $items); // prepend Method -> 컨테이너에 추가
        },
        error: (e) => {
          // 에러 발생 시
          alert(e.responseText);
        },
        complete: () => {
          // request에 대한 success/error 발생 후(처리 완료 후)
          resetModalFields(true); // Modal 초기화
        },
      });
    }
  };

  /* 메모 복수 조회 */
  const getMemos = function (el) {
    /* GET /api/memos */

    if (el) $GRID.masonry("remove", $(el));

    if (STATUS) {
      // STATUS가 true인 경우에 Ajax 호출
      PAGE += 1; // Pagination
      data = _getParams(); // 전역적으로 관리되고 있는 변수들을 dict 형태로 반환한 것을 get METHOD와 함께 보낸다
      $.ajax({
        url: "/api/memos",
        type: "get",
        data: data,
        beforeSend: () => {
          // Ajax가 서버로 요청하기 전에 실행되는 로직 실행
          $customActions.addClass("inactive"); // 로딩 아이콘 활성화(토글링)
        },
        success: (r) => {
          // 성공적으로 값을 서버로 보낸 경우
          // 조회한 memo 데이터 동적으로 생성 // r: 메모 데이터 리스트
          let itemHtmls = "";
          $.each(r, (_, el) => {
            itemHtmls += _makeMemoHtml(el); // el: 각각의 메모 데이터
          });
          itemHtmls += _makeMoreItemHtml(); // 추가 로드하기 버튼
          const $items = $(itemHtmls); // masonry에 그려주기
          $GRID.append($items).masonry("appended", $items); // append Method -> 컨테이너에 추가
        },
        error: (e) => {
          // 에러 발생 시
          STATUS = false; // Ajax가 호출되지 않도록 STATUS false 처리
          if (e.status == 404) {
            // 불러올 데이터가 없는 경우(404 에러)
            let html = _makeNoMoreItemHtml(); // 추가로 로드할 데이터 없음 알림
            let $html = $(html);
            $GRID.append($html).masonry("appended", $html);
          } else {
            alert(e.responseText);
          }
        },
        complete: () => {
          // request에 대한 success/error 발생 후(처리 완료 후)
          _resetGridLayout(); // 그리드 리셋
          setTimeout(() => {
            // 일정 시간(1초) 후 실행
            $customActions.removeClass("inactive"); // 로딩 아이콘 비활성화(토글링)
          }, 1000);
        },
      });
    }
  };

  /* 메모 조회 */
  const getMemo = function (id) {
    /* GET /api/memos/{id} */

    $.ajax({
      url: "/api/memos/" + id,
      type: "get",
      beforeSend: () => {
        resetModalFields(); // Modal 필드 리셋
      },
      success: (r) => {
        $modalTitle.val(r.title); // Modal의 Title 수정
        $modalContent.val(r.content); // Modal의 Content 수정
        $modalClose.attr("data-id", r.id); // index.js(27~39) -> Modal의 닫기 버튼에 있는 data-id값을 기준으로 updateMemo 함수 실행
        if (r.linked_image) {
          // 아이템 클릭 시, 이미지 동적 노출
          const ihtml = '<img src="' + r.linked_image + '" />';
          $modalMedia.html(ihtml);
        }
        $modalContent.trigger("keyup"); // index.js(63~67) -> textarea resizing(높이 값) 이벤트 실행을 위해 keyup triggering
      },
    });
  };

  /* 메모 삭제 */
  const deleteMemo = function (e, id) {
    /* PUT /api/memos/{id} */

    e.preventDefault();

    $.ajax({
      url: "/api/memos/" + id,
      type: "put",
      data: {
        is_deleted: true,
      },
      success: (r) => {
        const elems = $("#item" + r.id); // 메모 요소 선택
        $GRID.masonry("remove", elems); // 레이아웃에서 삭제
      },
      error: (e) => {
        alert(e.responseText);
      },
      complete: () => {
        $GRID.masonry("layout"); // 레이아웃 다시 그려주기
      },
    });
  };

  /* 메모 업데이트 */
  const updateMemo = function (id) {
    /* PUT /api/memos/{id} */

    const form = $modalEdit[0];

    const $item = $("#item" + id);
    const $title = $item.find(".item-title");
    const $content = $item.find(".item-content");
    const $media = $item.find(".item-media");
    const data = new FormData(form);

    if ($modalModified.val() == 1) {
      // Modal이 변경되었을때만 Ajax가 call 되도록 한다
      $.ajax({
        url: "/api/memos/" + id,
        type: "put",
        data: data,
        enctype: "multipart/form-data",
        processData: false,
        contentType: false,
        success: (r) => {
          // 업데이트 데이터 전송
          $title.html(r.title);
          $content.html(r.content);
          if (r.linked_image) {
            // 아이템 업데이트 시 이미지 동적 변경
            const ihtml = '<img src="' + r.linked_image + '" />';
            $media.html(ihtml); // 업데이트 시 바로 반영
          }
        },
        error: (e) => {
          // 에러 발생 시
          alert(e.responseText);
        },
        conplete: () => {
          resetModalFields(true); // 완료 시에 모달 리셋, masonry layout refresh
        },
      });
    }
  };

  /* 메모 되살리기 */
  const reviveMemo = function (e, id) {
    /* PUT delete /api/memos/{id} */

    e.preventDefault();

    const data = {
      is_deleted: false,
    };

    $.ajax({
      url: "/api/memos/" + id,
      type: "put",
      data: data,
      success: (r) => {
        ($elems = $("#item" + r.id)), $GRID.masonry("remove", $elems);
      },
      error: (e) => {
        alert(e.responseText);
      },
      complete: () => {
        _resetGridLayout();
      },
    });
  };

  /* 이미지 제거 */
  const detachImage = function (e, id) {
    /* DELETE /api/memos/{id} */

    e.preventDefault();
    const $media = $('.item[data-id="' + id + '"]').find(".item-media");
    if (id && $media.find("img").length > 0) {
      $.ajax({
        url: "api/memos/" + id + "/image",
        type: "delete",
        success: (r) => {
          $media.html("");
        },
        error: (e) => {
          alert(e.responseText);
        },
        complete: () => {
          // 높이값 재설정(masonry 레이아웃(그리드) 초기화)
          resetModalFields(true);
        },
      });
    }
  };


  /* 라벨 복수 조회 */
  const getLabels = function () {
    /*  GET /api/labels */

    $.ajax({
      url: "/api/labels",
      type: "get",
      success: (r) => {
        let html = "";
        $.each(r, (_, el) => {
          // 라벨 조회
          html += _makeLabelBtnHtml(el); // 라벨 버튼 생성
        });
        $("#sidemenu").find(".sidemenu-btn-memo").after(html); // 메모 버튼 뒤에 삽입
        MEMORY_LABELS = r; // 메모리에 라벨 데이터 저장
      },
      error: (e) => {
        alert(e.responseText); // 에러시 alert 노출
      },
    });
  };

  /* 라벨 생성 */
  const addLabel = function (e) {
    /* POST /api/labels */

    e.preventDefault();
    $input = $(e.target);
    const val = $input.val();
    if (val != "") {
      $.ajax({
        url: "/api/labels",
        type: "post",
        data: {
          content: val, // 라벨 추가
        },
        success: (r) => {
          let html = _makeLabelBtnHtml(r); // 라벨 버튼 생성
          $(".sidemenu-label-add-btn").before(html); // 라벨 추가 버튼 앞에 삽입
          $input.val(""); // 인풋 초기화
          MEMORY_LABELS.push(r); // 메모리에 라벨 추가
        },
        error: (e) => {
          alert(e.responseText); // 에러시 alert 노출
        },
      });
    }
  };

  /* 라벨 삭제 */
  const deleteLabel = function (e, id) {
    /* DELETE /api/labels/{id} */

    e.stopPropagation();
    c = confirm("라벨을 정말 삭제하시겠습니까?");
    if (!c) return false;

    $.ajax({
      url: "/api/labels/" + id,
      type: "delete",
      success: (r) => {
        $(e.target).closest("button.sidemenu-btn").remove(); // 라벨 메뉴 아이템 삭제
        $('.mdl-chip[data-label-id="' + id + '"]').remove(); // 라벨 칩 삭제
        $.each(MEMORY_LABELS, (i, v) => {
          if (v.id == id) {
            MEMORY_LABELS.pop(i); // 메모리 라벨 팝
            return false;
          }
        });
      },
      error: (e) => {
        alert(e.responseText); // 에러시 alert 노출
      },
      complete: () => {
        _resetGridLayout(); // 완료시 그리드 리셋
      },
    });
  };

  /* 메모에 라벨 적용 */
  const attachLabels = function (id) {
    /* *  PUT /api/memos/{id} * */

    const $item = $("#item" + id);
    const labels = [];
    $item
      .find(".item-labels")
      .find('input[type="checkbox"]:checked')
      .each(function (_, item) {
        labels.push($(item).val());
      });

    $.ajax({
      url: "/api/memos/" + id,
      type: "put", // 메모 업데이트 호출
      data: {
        labels: labels.join(","), // 라벨 데이터 콤마스트링 처리
      },
      success: (r) => {
        let html = "";
        html += _makeLabelChipHtml(r); // 라벨 칩 태그 생성
        $item.find(".item-chip").html(html); // 메모 아이템에 라벨 칩 추가
      },
      error: (e) => {
        // 에러시 alert 노출
        alert(e.responseText);
      },
      complete: () => {
        // 완료 시 그리드 리셋
        _resetGridLayout;
      },
    });
  };

  /* 메모 검색 조회 */
  const getMemosByNeedle = function (needle) {
    STATUS = true;
    PAGE = 0;
    NEEDLE = needle;
    _removeAllMemos();
    getMemos();
  };

  /* 메모 라벨로 조회 */
  const getMemosByLabel = function (labelId) {
    STATUS = true;
    PAGE = 0;
    LABEL = labelId;
    IS_DELETED = false;
    _removeAllMemos();
    getMemos();
  };

  /* 메모 init */
  const init = function () {
    getLabels();
    getMemos();
  };

  /* 삭제된 메모 조회 */
  const getDeletedMemos = function () {
    STATUS = true;
    PAGE = 0;
    IS_DELETED = true;
    LABEL = null;
    _removeAllMemos();
    getMemos();
  };

  /* 기본 메모 조회 */
  const refreshMemos = function () {
    STATUS = true;
    PAGE = 0;
    IS_DELETED = false;
    LABEL = null;
    _removeAllMemos();
    getMemos();
  };

  /* 팝업 라벨 메뉴 */
  const getLabelsForMenu = function (e, memo_id) {
    e.preventDefault();
    let html = "";
    $.each(MEMORY_LABELS, function (_, el) {
      html += _makeLabelMenuHtml(el);
    });
    $itemLabels = $("#item" + memo_id);
    $itemLabels.find(".item-label-li").remove();
    $itemLabels.find(".item-labels").prepend(html);
  };

  // const thumbsCount = function (e, memo_id) {
  //   e.preventDefault();

  //   data = _getParams();
  //   data.liked += 1;
  //   // thisMemo.liked += 1;

  // }

  return {
    getMemo: getMemo,
    getMemos: getMemos,
    getMemosByLabel: getMemosByLabel,
    getLabels: getLabels,
    getLabelsForMenu: getLabelsForMenu,
    getDeletedMemos: getDeletedMemos,
    getMemosByNeedle: getMemosByNeedle,
    refreshMemos: refreshMemos,
    deleteMemo: deleteMemo,
    reviveMemo: reviveMemo,
    updateMemo: updateMemo,
    createMemo: createMemo,
    resetModalFields: resetModalFields,
    detachImage: detachImage,
    attachLabels: attachLabels,
    deleteLabel: deleteLabel,
    addLabel: addLabel,
    // thumbsCount: thumbsCount,
    init: init,
  };
})();
