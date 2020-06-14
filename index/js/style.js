var target, use_tls, editor;

$(function() {
    ace.config.set('basePath', 'https://cdnjs.cloudflare.com/ajax/libs/ace/1.4.11/');

    editor = generate_editor("editor", "json", false);

    generate_editor($("#schema-proto")[0], "protobuf", true);
    generate_editor($("#json-response")[0], "json", true);
});

$('#server-target').on('keypress',function(e) {
    if(e.which == 13) {
        reflect_service();
    }
});

$('#get-services').click(function(){
    reflect_service();
});

$('#select-service').change(function(){
    var selected = $(this).val();
    if (selected == "") {
        return false;
    }

    $('#body-request').hide();
    $('#response').hide();
    $.ajax({
        url: "server/"+target+"/service/"+selected+"/functions",
        global: true,
        method: "GET",
        success: function(res){
            if (res.error) {
                alert(res.error);
                return;
            }
            $("#select-function").html(new Option("Choose Method", ""));
            $.each(res.data, (_, item) => $("#select-function").append(new Option(item.substr(selected.length) , item)));
            $('#choose-function').show();
        },
        error: err,
        beforeSend: function(xhr){
            $('#choose-function').hide();
            xhr.setRequestHeader('use_tls', use_tls);
            show_loading();
        },
        complete: function(){
            hide_loading();
        }
    });
});

$('#select-function').change(function(){
    var selected = $(this).val();
    if (selected == "") {
        return false;
    }

    $('#response').hide();
    $.ajax({
        url: "server/"+target+"/function/"+selected+"/describe",
        global: true,
        method: "GET",
        success: function(res){
            if (res.error) {
                alert(res.error);
                return;
            }

            editor.setValue(res.data.template, 1);
            
            schemeViewer = ace.edit("schema-proto");
            schemeViewer.setValue(res.data.schema, -1);
            $('#body-request').show();
        },
        error: err,
        beforeSend: function(xhr){
            $('#body-request').hide();
            xhr.setRequestHeader('use_tls', use_tls);
            show_loading();
        },
        complete: function(){
            hide_loading();
        }
    });
});

$('#invoke-func').click(function(){
    var func = $('#select-function').val();
    if (func == "") {
        return false;
    }
    var body = editor.getValue();
    var button = $(this).html();
    $.ajax({
        url: "server/"+target+"/function/"+func+"/invoke",
        global: true,
        method: "POST",
        data: body,
        dataType: "json",
        success: function(res){
            if (res.error) {
                alert(res.error);
                return;
            }

            fmtResult = formatJson(res.data.result || res.data.errorResult);
            respViewer = ace.edit("json-response");
            respViewer.setValue(fmtResult, -1);

            if (res.data.errorResult) {
                $('#response').addClass("response-error");
                $("#response .card-title a").text("Error");
            }
            $("#timer-resp span").html(res.data.timer);
            $('#response').show();
        },
        error: err,
        beforeSend: function(xhr){
            $('#response').hide();
            $('#response').removeClass("response-error");
            $("#response .card-title a").text("Response");
            xhr.setRequestHeader('use_tls', use_tls);
            $(this).html("Loading...");
            show_loading();
        },
        complete: function(){
            $(this).html(button);
            hide_loading();
        }
    });
});

function formatJson(json) {
    return JSON.stringify(JSON.parse(json), null, '  ');
}

function reflect_service() {
    var t = get_valid_target();

    use_tls = "false";
    var restart = "0"
    if($('#restart-conn').is(":checked")) {
        restart = "1"
    }

    // determine whether the proto connection will use local proto or not
    const use_proto = $('#local-proto').is(":checked");

    if (target != t || restart == "1" || use_proto) {
        target = t;
    } else {
        return false;
    }

    // prepare ajax options beforehand
    // makes it easier for local proto to modify some of its properties
    const ajaxProps = {
        url: "server/"+target+"/services?restart="+restart,
        global: true,
        method: "GET",
        success: function(res){
            if (res.error) {
                target = "";
                use_tls = "";
                alert(res.error);
                return;
            }
            $("#select-service").html(new Option("Choose Service", ""));
            $.each(res.data, (_, item) => $("#select-service").append(new Option(item, item)));
            $('#choose-service').show();
        },
        error: function(_, _, errorThrown) {
            target = "";
            use_tls = "";
            alert(errorThrown);
        },
        beforeSend: function(xhr){
            $('#choose-service').hide();
            xhr.setRequestHeader('use_tls', use_tls);
            $(this).html("Loading...");
            show_loading();
        },
        complete: function(){
            applyConnCount();
            $(this).html(button);
            hide_loading();
        }
    };

    // modify ajax options if use local proto
    if (use_proto) {
        ajaxProps.method = "POST";
        ajaxProps.enctype = "multipart/form-data";
        ajaxProps.processData = false;
        ajaxProps.contentType = false;
        ajaxProps.cache = false;
        ajaxProps.data = getProtos();
    }

    $('.other-elem').hide();
    var button = $("#get-services").html();
    $.ajax(ajaxProps);
}

function generate_editor(target, syntax, readonly) {
    e = ace.edit(target);
    e.setOptions({
        maxLines: Infinity,
        fontFamily: 'SFMono-Regular,Menlo,Monaco,Consolas,"Liberation Mono","Courier New",monospace',
        fontSize: "14px"
    });
    e.renderer.setScrollMargin(10, 10, 10, 10);
    e.renderer.setShowGutter(false);
    e.setTheme("ace/theme/textmate");
    if (readonly) {
        e.setReadOnly(true);
        e.setHighlightActiveLine(false);
    }
    e.session.setMode("ace/mode/" + syntax);
    return e;
}

function get_valid_target() {
    t = $('#server-target').val().trim();
    if (t == "") {
        return target;
    }

    ts = t.split("://");
    if (ts.length > 1) {
        $('#server-target').val(ts[1]);
        return ts[1];
    }
    return ts[0];
}

function err(_, _, errorThrown) {
    alert(errorThrown);
}

function show_loading() {
    $('.spinner').show();
}

function hide_loading() {
    $('.spinner').hide();
}

$(".connections ul").on("click", "i", function(){
    $icon = $(this);
    $parent = $(this).parent("li");
    var ip = $(this).siblings("span").text();

    $.ajax({
        url: "active/close/" + ip,
        global: true,
        method: "DELETE",
        success: function(res){
            $('[data-toggle="tooltip"]').tooltip('hide');
            if(res.data.success) {
                $parent.remove();
                updateCountNum();
            }
        },
        error: err,
        beforeSend: function(xhr){
            $icon.attr('class', 'fa fa-spinner');
        },
    });
});

function updateCountNum() {
    $(".connections .title span").html($(".connections ul li").length);
}

function applyConnCount() {
    $('[data-toggle="tooltip"]').tooltip('hide');

    $.ajax({
        url: "active/get",
        global: true,
        method: "GET",
        success: function(res){
            $(".connections .title span").html(res.data.length);
            $(".connections .nav").html("");
            res.data.forEach(function(item){
                $list = $("#conn-list-template").clone();
                $list.find(".ip").html(item);
                $(".connections .nav").append($list.html());
            });
            refreshToolTip();
        },
        error: function (_, _, thrownError) {
            console.warn("Failed to update active connections", thrownError)
        },
    });
}

function refreshConnCount() {
    applyConnCount();
    setTimeout(refreshConnCount, 10000);
}

function refreshToolTip() {
    $(function () {
        $('[data-toggle="tooltip"]').tooltip('dispose');
        $('[data-toggle="tooltip"]').tooltip();
    })
}

$(document).ready(function(){
    refreshConnCount();
});
