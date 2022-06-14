(function () {
  'use strict';

  // 2016-19 - ntop.org

  function datatableRemoveEmptyRow(table) {
    $("tbody tr.emptyRow", $(table)).remove();
  }

  function datatableAddEmptyRow(table, empty_str) {
    var columns = $("thead th", $(table)).filter(function() {
     return $(this).css('display') != 'none';
    }).length;
    $("tbody", $(table)).html('<tr class="emptyRow"><td colspan="' + columns + '"><i>' + empty_str + '</i></td></tr>');
  }

  function datatableGetNumDisplayedItems(table) {
     return $("tr:not(.emptyRow)", $(table)).length - 1;
  }

  function datatableIsEmpty(table) {
    return datatableGetNumDisplayedItems(table) == 0;
  }

  function datatableGetByForm(form) {
    return $("table", $("#dt-top-details", $(form)).parent())
  }

  function datatableUndoAddRow(new_row, empty_str, bt_to_enable, callback_str) {
    if (bt_to_enable)
       $(bt_to_enable).removeAttr("disabled").removeClass("disabled");

    var form = $(new_row).closest("form");
    $(new_row).remove();
    aysUpdateForm(form);
    var dt = datatableGetByForm(form);

    if (datatableIsEmpty(dt))
       datatableAddEmptyRow(dt, empty_str);

     if (callback_str)
        // invoke
        window[callback_str](new_row);
  }

  function datatableForEachRow(table, callbacks) {
     $("tr:not(:first)", table).each(function(row_i) {
        if(typeof callbacks === 'function') {
           callbacks.bind(this)(row_i);
        } else {
           var i;
           for (i=0; i<callbacks.length; i++)
              callbacks[i].bind(this)(row_i);
        }
     });
  }

  function datatableAddButtonCallback(td_idx, label, bs_class, callback_str, link, visible = true, title = '') {
     if ($("td:nth-child("+td_idx+")", $(this)).find('div.d-flex').length == 0) {
        $("td:nth-child("+td_idx+")", $(this)).empty();
        $("td:nth-child("+td_idx+")", $(this)).append($("<div class='d-flex justify-content-center'></div>"));
     }
     $("td:nth-child("+td_idx+")", $(this)).find('.d-flex').append('<a href="' + link + `" title='${title}' data-placement="bottom" class="btn btn-sm mx-1 ${bs_class} ${!visible ? 'disabled' : ''}" onclick="` + callback_str + '" role="button">' + label + '</a>');
  }

  function datatableAddDeleteButtonCallback(td_idx, callback_str, label) {
      datatableAddButtonCallback.bind(this)(td_idx, label, "btn-danger", callback_str, "javascript:void(0)", true, 'Delete');
  }

  function datatableAddActionButtonCallback(td_idx, callback_str, label, visible = true, title = '') {
      datatableAddButtonCallback.bind(this)(td_idx, label, "btn-info", callback_str, "javascript:void(0)", visible, title);
  }
      
  function datatableAddFilterButtonCallback(td_idx, callback_str, label, title = '', visible = true) {
      datatableAddButtonCallback.bind(this)(td_idx, label, "btn-warning", callback_str, "javascript:void(0)", visible, title);
  }

  function datatableAddLinkButtonCallback(td_idx, link, label, title = '') {
     datatableAddButtonCallback.bind(this)(td_idx, label, "btn-info", "", link, true, title);
  }

  function datatableMakeSelectUnique(tr_obj, added_rows_prefix, options) {
     options = NtopUtils.paramsExtend({
        on_change: $.noop,                     /* A callback to be called when the select input changes */
        selector_fn: function(obj) {           /* A callback which receives a tr object and returns a single select input */
           return obj.find("select").first();
        },
     }, options);

     function datatableForeachSelectOtherThan(this_select, added_rows_prefix, selector_fn, callback) {
        $("[id^=" + added_rows_prefix + "]").each(function(){
           var other = selector_fn($(this));
           if (other[0] != this_select[0])
              callback(other);
        });
     }

     function datatableOptionChangeStatus(option_obj, enable) {
        if (enable) {
           option_obj.removeAttr("disabled");
        } else {
           var select_obj = option_obj.closest("select");
           var should_reset = (select_obj.val() == option_obj.val());
           option_obj.attr("disabled", "disabled");

           if(should_reset) {
              var new_val = select_obj.find("option:not([disabled])").first().val();
              select_obj.val(new_val);
              select_obj.attr("data-old-val", new_val);
           }
        }
     }

     function datatableOnSelectEntryChange(added_rows_prefix, selector_fn, change_callback) {
        var old_value = $(this).attr("data-old-val") || "";
        var new_value = $(this).val() || "";
        var others = [];

        if (old_value == new_value)
           old_value = "";

        datatableForeachSelectOtherThan($(this), added_rows_prefix, selector_fn, function(other) {
           datatableOptionChangeStatus(other.find("option[value='" + old_value + "']"), true);
           datatableOptionChangeStatus(other.find("option[value='" + new_value + "']"), false);
           others.push(other);
        });

        change_callback($(this), old_value, new_value, others, datatableOptionChangeStatus);

        $(this).attr("data-old-val", new_value);
     }

     function datatableOnAddSelectEntry(select_obj, added_rows_prefix, selector_fn) {
        select_obj.val("");

        // Trigger an update on other inputs in order to disable entries on the select_obj
        datatableForeachSelectOtherThan(select_obj, added_rows_prefix, selector_fn, function(other) {
           //datatableOptionChangeStatus(select_obj.find("option[value='" + other.val() + "']"), false);
           other.trigger("change");
        });

        // select first available entry
        var new_sel = select_obj.find("option:not([disabled])").first();
        var new_val = new_sel.val();

        // trigger change event to update other entries
        select_obj.val(new_val);
        select_obj.trigger("change");
     }

     var select = options.selector_fn(tr_obj);
     select.on("change", function() { datatableOnSelectEntryChange.bind(this)(added_rows_prefix, options.selector_fn, options.on_change); });
     select.on("remove", function() {$(this).val("").trigger("change");});
     datatableOnAddSelectEntry(select, added_rows_prefix, options.selector_fn);
  }

  function datatableIsLastPage(table) {
     var lastpage = $("#dt-bottom-details .pagination li:nth-last-child(3)", $(table));
     return !((lastpage.length == 1) && (lastpage.hasClass("active") == false));
  }

  function datatableGetColumn(table, id_key, id_value) {
     var res = table.data("datatable").resultset.data.filter(function(item) {
        return item[id_key] === id_value;
     });

     if(res) return res[0];
  }

  function datatableGetColumnIndex(table, column_key) {
     var index = table.data("datatable").options.columns.findIndex(function(item) {
        return item.field === column_key;
     });

     return(index);
  }

  /*
   * Helper function to add refreshable datatables rows.
   *
   * table: the datatable div jquery object
   * column_id: the field key used to indentify the rows
   * refresh_interval: milliseconds refresh interval for this table
   * trend_columns: (optional) a map <field -> formatter_fn> which indicates the numeric columns
   * which should be shown with up/down arrows upon refresh.
   *
   * Returns true on success, false otherwise.
   *
   * Example usage:
   *   $("#table-redis-stats").datatable({
   *     ...
   *     tableCallback: function() {
   *       // The table rows will be identified by the "column_key",
   *       // refreshed every 5 seconds, with up/down arrows on the "column_hits"
   *       datatableInitRefreshRows($("#table-redis-stats"), "column_key", 5000, {"column_hits": addCommas});
   *     }
   *   });
   */
  function datatableInitRefreshRows(table, column_id, refresh_interval, trend_columns) {
    var $dt = table.data("datatable");
    var rows = $dt.resultset.data;
    var old_timer = table.data("dt-rr-timer");
    var old_req = table.data("dt-rr-ajax");
    trend_columns = trend_columns || {};

    if(old_timer) {
      // Remove the previously set timer to avoid double scheduling
      clearInterval(old_timer);
      table.removeData("dt-rr-timer");
    }

    if(old_req) {
      // Abort the previous request if any
      old_req.abort();
      table.removeData("dt-rr-ajax");
    }

    var ids = [];
    var id_to_row = {};

    for(var row in rows) {
      var data = rows[row];

      if(data[column_id]) {
        var data_id = data[column_id];
        id_to_row[data_id] = row;
        ids.push(data_id);
      }
    }

    if(!ids)
      return(false);

    // These parameters will be passed to the refresh endpoint
    // the custom_hosts parameter will be passed in the AJAX request and
    // will contain the IDs to refresh. It should be used by the receiving
    // Lua script as a filter
    var params = {
      "custom_hosts": ids.join(",")
    };
    var url = $dt.options.url;
    var first_load = true;

    var _process_result = function(result) {
      if(typeof(result) === "string")
        result = JSON.parse(result);

      if(!result) {
        console.error("Bad JSON result");
        return;
      }

      for(var row in result.data) {
         var data = result.data[row];
         var data_id = data[column_id];

         if(data_id && id_to_row[data_id]) {
            var row_idx = id_to_row[data_id];
            var row_html = $dt.rows[row_idx];
            var row_tds = $("td", row_html);

            /* Try to update all the fields for the current row (row_html) */
            for(var key in data) {
               var col_idx = datatableGetColumnIndex(table, key);
               var cell = row_tds[col_idx];
               var $cell = $(cell);

               var old_val = $cell.data("dt-rr-cur-val") || $(cell).html();
               var trend_value_formatter = trend_columns[key];
               var new_val = data[key];
               var arrows = "";

               if(trend_value_formatter) {
                if(parseFloat(new_val) != new_val)
                  console.warn("Invalid number: " + new_val);

                if(!first_load)
                  arrows = " " + NtopUtils.drawTrend(parseFloat(new_val), parseFloat(old_val));

                // This value will be neede in the next refresh
                $cell.data("dt-rr-cur-val", new_val);

                new_val = trend_value_formatter(new_val);
              }

               $(cell).html((new_val != 0) ? (new_val + arrows) : "");
            }
         }
      }

      first_load = false;
      table.removeData("dt-rr-ajax");
   };

    // Save the timer into "dt-rr-timer" to be able to stop it if
    // datatableInitRefreshRows is called again
    table.data("dt-rr-timer", setInterval(function() {
      // Double check that a request is not pending
      var old_req = table.data("dt-rr-ajax");

      if(old_req)
        return;

      // Save the ajax request to possibly abort it if
      // datatableInitRefreshRows is called again
      table.data("dt-rr-ajax", $.ajax({
         type: 'GET',
         url: url,
         data: params,
         cache: false,
         success: _process_result,
      }));
    }, refresh_interval));

    // First update
    _process_result($dt.resultset);
  }

  function draw_processes_graph(http_prefix, graph_div_id, host) {
      var links;
      var nodes = {};

      var url = http_prefix + '/lua/get_processes_graph_data.lua?host=' + host;

      d3.json(url, function(error, json) {
  	if(error)
  	    return console.warn(error);

  	links = json;
  	var _link;

  	// Compute the distinct nodes from the links.
  	links.forEach(function(link) {
  	    if(link.source_pid == -1) {
  		/* IP Address -> PID */
  		_link = http_prefix + "/lua/host_details.lua?host=" + link.source;
  	    } else {
  		/* PID -> IP Address */
  		_link = http_prefix + "/lua/process_details.lua?pid=" + link.source_pid + "&pid_name=" + link.source_name + "&host=" + host + "&page=flows";
  	    }

  	    link.source = nodes[link.source]
  		|| (nodes[link.source] = {
  		    name: link.source_name, num:link.source,
  		    link: _link, type: link.source_type, pid: link.source_pid
  		});

  	    if(link.target_pid == -1) {
  		/* IP Address -> PID */
  		_link = http_prefix + "/lua/host_details.lua?host=" + link.target;
  	    } else {
  		/* PID -> IP Address */
  		_link = http_prefix + "/lua/process_details.lua?pid=" + link.target_pid + "&pid_name=" + link.target_name + "&host=" + host + "&page=flows";
  	    }

  	    link.target = nodes[link.target]
  		|| (nodes[link.target] = {
  		    name: link.target_name, num: link.target,
  		    link: _link, type: link.target_type, pid: link.target_pid
  		});
  	});

  	var width = 960, height = 500, arrow_size = 6;
  	var color = d3.scale.category10();

  	/* Same colors as those used in the flow_details.lua page to represent hosts and processes */
  	color["proc"] = "red";
  	color["host"] = "lightsteelblue";

  	var force = d3.layout.force()
  	    .nodes(d3.values(nodes))
  	    .links(links)
  	    .size([width, height])
  	    .linkDistance(120) // Arc length
  	    .charge(-400)
  	    .on("tick", tick)
  	    .start();

  	var svg = d3.select("#" + graph_div_id).append("svg")
  	    .attr("id", "ebpf_graph")
  	    .attr("width", width)
  	    .attr("height", height);

  	// Per-type markers, as they don't inherit styles.
  	svg.append("defs").selectAll("marker")
  	    .data(["proc2proc", "proc2host", "host2proc", "host2host"])
  	    .enter().append("marker")
  	    .attr("id", function(d) { return d; })
  	    .attr("viewBox", "0 -5 10 10")
  	    .attr("refX", 15)
  	    .attr("refY", -1.5)
  	    .attr("markerWidth", arrow_size).attr("markerHeight", arrow_size)
  	    .attr("orient", "auto")
  	    .append("path")
  	    .attr("d", "M0,-5L10,0L0,5");

  	var path = svg.append("g").selectAll("path")
  	    .data(force.links())
  	    .enter().append("path")
  	    .attr("class", function(d) { return "link " + d.type; })
  	    .attr("marker-end", function(d) { return "url(#" + d.type + ")"; });


  	var circle = svg.append("g").selectAll("circle")
  	    .data(force.nodes())
  	    .enter().append("circle")
  	    .attr("class", "ebpf_circle")
  	    .attr("r", 8) /* Radius */
  	    .style("fill", function(d) { return color[d.type]; })
  	    .call(force.drag)
  	    .on("dblclick", function(d) {
  		window.location.href = d.link;
  	    } );

  	// Circle label
  	var text = svg.append("g").selectAll("text")
  	    .data(force.nodes())
  	    .enter().append("text")
  	    .attr("class", "ebpf_text")
  	    .attr("x", 12)
  	    .attr("y", ".31em")
  	    .text(function(d) {
  		if(d.pid >= 0) // Process
  		    return(d.name + " [pid: "+d.pid+"]");
  		else { // Host
  		    return(d.name);
  		}
  	    });

  	// Use elliptical arc path segments to doubly-encode directionality.
  	function tick() {
  	    path.attr("d", linkArc);
  	    circle.attr("transform", transform);
  	    text.attr("transform", transform);
  	}

  	function linkArc(d) {
  	    var dx = d.target.x - d.source.x,
  		dy = d.target.y - d.source.y,
  		dr = Math.sqrt(dx * dx + dy * dy);
  	    return "M" + d.source.x + "," + d.source.y + "A" + dr + "," + dr + " 0 0,1 " + d.target.x + "," + d.target.y;
  	}

  	function transform(d) {
  	    return "translate(" + d.x + "," + d.y + ")";
  	}
      });
  }

  var ebpfUtils = /*#__PURE__*/Object.freeze({
    __proto__: null,
    draw_processes_graph: draw_processes_graph
  });

  // 2019 - ntop.org

  (history.state) ? (history.state.zoom_level) : 0;

  /* Use with:
    *
    * $('#edit-recipient-modal form').modalHandler({ ... })
    */
  class ModalHandler {

      constructor(form, options) {

          if (typeof options.csrf === "undefined") {
              throw new Error("ModalHandler::Missing CSRF token!");
          }

          this.element = form;
          this.dialog = $(form).closest(".modal");

          this.options = options;
          this.csrf = options.csrf;
          this.dontDisableSubmit = options.dontDisableSubmit;

          this.observer = new MutationObserver((list) => {
              this.bindFormValidation();
              this.toggleFormSubmission();
              this.initDataPatterns();
          });

          this.observer.observe(this.element[0], {
              childList: true,
              subtree: true
          });

          this.initialState = null;
          this.currentState = null;
          this.firstCloseAttempt = false;
          this.isSubmitting = false;

          const submitButton = $(this.element).find(`[type='submit']`);
          if (submitButton.length == 0) {
              throw new Error("ModalHandler::The submit button was not found inside the form!");
          }

          this.toggleFormSubmission();

      }

      initDataPatterns() {
          NtopUtils.initDataPatterns();
      }

      /**
       * Create a form's snapshot to save a form state
       */
      createFormSnapshot() {

          const snapshot = {
              inputs: {},
              hidden: []
          };

          $(this.element).find('textarea,select,input[type!="radio"]').each(function () {

              const type = $(this).prop('nodeName').toLowerCase();
              const name = $(this).attr('name');
              snapshot.inputs[`${type}[name='${name}']`] = $(this).val();
          });

          $(this.element).find(`[style='display: none;'], span.invalid-feedback`).each(function () {
              snapshot.hidden.push($(this));
          });

          return snapshot;
      }

      compareFormSnaphsot(s1, s2) {

          if (s1 == null || s2 == null) return true;

          for (let [key, value] of Object.entries(s1.inputs)) {
              if (s2.inputs[key] != value) return false;
          }

          return true;
      }

      delegateModalClosing() {

          const self = this;

          $(this.dialog).find('button.cancel').off('click').click(function () {

              self.firstCloseAttempt = false;
              $(self.element)[0].reportValidity();
              $(self.dialog).find('.confirm-closing').fadeOut(100, function () {
                  $(self.dialog).find('button.btn-close').fadeIn(100);
              });
          });

          $(this.dialog).off('hide.bs.modal').on('hide.bs.modal', function (event) {
              
              if (self.isSubmitting) {
                  event.preventDefault();
                  return;
              }

              // if the form state hasn't changed then don't show the message
              if (self.compareFormSnaphsot(self.currentState, self.initialState)) {
                  return;
              }

              if (self.firstCloseAttempt) return;
              // abort the modal closing event
              event.preventDefault();

              // flag a close attempt has been invoked
              self.firstCloseAttempt = true;
              
              // show an alert to inform the user
              $(self.dialog).find('button.btn-close').fadeOut(100, function () {
                  $(self.dialog).find('.confirm-closing').fadeIn(100);
              });

              return;

          });

          $(this.dialog).off('hidden.bs.modal').on('hidden.bs.modal', function (event) {

              // for each input inside the form restore the initial value
              // from the snapshot taken at init
              for (const [selector, value] of Object.entries(self.initialState.inputs)) {
                  $(self.dialog).find(selector).val(value);
                  $(self.dialog).find(selector).removeClass('is-invalid');
              }

              // hide the shwon elements
              self.initialState.hidden.forEach(($hidden) => {
                  $hidden.hide();
              });

              self.element.find(`[type='submit']`).attr("disabled", "disabled");
              self.currentState = null;
              self.firstCloseAttempt = false;

              $(self.dialog).find('.confirm-closing').fadeOut(100, function () {
                  $(self.dialog).find('button.btn-close').fadeIn(100);
              });

              // clean the form when the modal is closed
              // to prevent the fields flickering
              self.cleanForm();
          });
      }

      fillFormModal() {
          return this.options.loadFormData();
      }

      invokeModalInit(data = {}) {

          const self = this;

          // reset form values when the modal closes
          this.delegateModalClosing();
          this.data = data || this.fillFormModal();
          this.options.onModalInit(this.data, this);

          $(this.element).parents('.modal').on('show.bs.modal', function () {
              self.options.onModalShow();
          });

          // create a initial form snapshot to restore elements on closing
          this.initialState = this.createFormSnapshot();
          this.currentState = null;

          this.delegateResetButton();   
      }

      delegateSubmit() {

          this.bindFormValidation();

          const self = this;

          this.submitHandler = function (e) {
              if (!self.options.isSyncRequest) {
                  e.preventDefault();
                  e.stopPropagation();
                  self.makeRequest();
              }
          };

          $(this.element).on('submit', this.submitHandler);
      }

      bindFormValidation() {

          const self = this;

          // handle input validation
          $(this.element).find(`input,select,textarea`).each(async function (i, input) {

              // jQuery object of the current input
              const $input = $(this);
              // id to handle the current timeout set to show errors
              let timeoutId = -1;

              const validHostname = async () => {

                  // show the spinner to the user and set the input to readonly
                  const $spinner = $input.parent().find('.spinner-border');
                  $input.attr("readonly", true);
                  $spinner.show();

                  const response = await NtopUtils.resolveDNS($(input).val());

                  // hide the spinner and renable write to the input
                  $input.removeAttr("readonly");
                  $spinner.hide();

                  // if the response was negative then alert the user
                  if (response.rc < 0) {
                      input.setCustomValidity(response.rc_str);
                      return [false, response.rc_str_hr];
                  }

                  // return success for valid resolved hostnmae
                  input.setCustomValidity("");

                  return [true, "Success"];
              };

              const validInput = async (validation) => {

                  // if the input require to validate host name then perform a DNS resolve
                  if (validation.data.resolveDNS && $input.val().match(NtopUtils.REGEXES.domainName)) {
                      return await validHostname();
                  }

                  if (validation.data.cannotBeEmpty && validation.isInputEmpty) {
                      // trigger input validation flag
                      input.setCustomValidity("Please fill the input.");
                      return [false, validation.data.validationEmptyMessage || i18n_ext.missing_field];
                  }

                  if (input.validity.patternMismatch) {
                      input.setCustomValidity("Pattern mismatch.");
                      return [false, validation.data.validationMessage || i18n_ext.invalid_field];
                  }

                  if (input.validity.rangeOverflow) {
                      input.setCustomValidity("Value exceed the maximum value.");
                      return [false, validation.data.rangeOverflowMessage || i18n_ext.invalid_field];
                  }

                  if (input.validity.rangeUnderflow) {
                      input.setCustomValidity("Value is under the minimum value.");
                      return [false, validation.data.rangeUnderflowMessage || i18n_ext.invalid_field];
                  }

                  // set validation to true
                  input.setCustomValidity("");
                  return [true, "Success"];
              };

              const checkValidation = async () => {

                  const validation = {
                      data: {
                          validationMessage: $input.data('validationMessage'),
                          validationEmptyMessage: $input.data('validationEmptyMessage'),
                          cannotBeEmpty: ($input.attr('required') === "required") || ($input.data("validationNotEmpty") == true),
                          resolveDNS: $input.data('validationResolvedns'),
                          rangeOverflowMessage: $input.data('validationRangeOverflowMessage'),
                          rangeUnderflowMessage: $input.data('validationUnderflowOverflowMessage'),
                      },
                      isInputEmpty: (typeof($input.val()) === "string" ? $input.val().trim() == "" : false)
                  };

                  const [isValid, messageToShow] = await validInput(validation);
                  let $error = $input.parent().find(`.invalid-feedback`);

                  // if the error element doesn't exist then create a new one
                  if ($error.length == 0) {
                      $error = $(`<span class='invalid-feedback'></span>`);
                  }

                  // display the errors and color the input box
                  if (!isValid) {
                      $input.addClass('is-invalid');
                      $input.parent().append($error);
                      $error.text(messageToShow);
                  }
                  else {
                      // clean the validation message and remove the error
                      $input.removeClass('is-invalid');
                      $error.fadeOut(500, function () { $(this).remove(); });
                  }
              };

              $(this).off('input').on('input', function (e) {

                  self.currentState = self.createFormSnapshot();

                  // if exists already a Timeout then clear it
                  if (timeoutId != -1) clearTimeout(timeoutId);

                  if (!$input.attr("formnovalidate")) {
                      // trigger input validation after 300msec
                      timeoutId = setTimeout(() => {
                          checkValidation();
                          // trigger form validation to enable the submit button
                          self.toggleFormSubmission();
                      }, 300);
                      // the user has changed the input, we can abort the first close attempt
                      self.firstCloseAttempt = false;
                  }
              });

              $(this).off('invalid').on('invalid', function (e) {
                  e.preventDefault();
                  if (!$input.attr("formnovalidate")) {
                      checkValidation();
                  }
              });
          });

      }

      getModalID() {
          return $(this.element).parents('.modal').attr('id');
      }

      toggleFormSubmission() {

          let isValid = true;

          // if each input is marked as valid then enable the form submit button
          $(this.element).find('input:not(:disabled),select:not(:disabled),textarea:not(:disabled)').each(function (idx, input) {
              // make a concatenate & between valid flags
              isValid &= input.validity.valid;
          });

          isValid
              ? $(this.element).find(`[type='submit'],[type='test']`).removeAttr("disabled")
              : $(this.element).find(`[type='submit'],[type='test']`).attr("disabled", "disabled");
      }

      cleanForm() {
          /* remove validation class from fields */
          $(this.element).find('input,textarea,select').each(function (i, input) {
              $(this).removeClass(`is-valid`).removeClass(`is-invalid`);
          });
          /* reset all the values */
          $(this.element)[0].reset();
      }

      makeRequest() {

          const $feedbackLabel = $(this.element).find(`.invalid-feedback`);
          const submitButton = $(this.element).find(`[type='submit']`);
          let dataToSend = this.options.beforeSumbit(this.data);

          dataToSend.csrf = this.csrf;
          dataToSend = $.extend(dataToSend, this.options.submitOptions);

          /* clean previous state and disable button */
          submitButton.attr("disabled", "disabled");

          const self = this;

          if (this.options.endpoint) {
              let request;

              if (self.options.method == "post") {
                  request = $.ajax({
                      url: this.options.endpoint,
                      data: JSON.stringify(dataToSend),
                      method: self.options.method,
                      dataType: "json",
                      contentType: "application/json; charset=utf-8"
                  });
              }
              else {
                  request = $.get(this.options.endpoint, dataToSend);
              }

              this.isSubmitting = true;

              request.done(function (response, textStatus) {

                  // clear submitting state
                  self.isSubmitting = false;
                  // clear the current form state
                  self.currentState = null;

                  if (self.options.resetAfterSubmit) self.cleanForm();
                  $feedbackLabel.hide();

                  const success = self.options.onSubmitSuccess(response, dataToSend, self);
                  // if the submit return a true boolean then close the modal
                  if (success) {
                    if(self.dialog.modal)
                      self.dialog.modal('hide');
                    else {
                      self.dialog[0].hidden = true;
                      $(`.modal-backdrop.fade.show`).remove();
                    }
                  }

                  /* unbind the old closure on submit event and bind a new one */
                  $(self.element).off('submit', self.submitHandler);
                  self.delegateSubmit();
              })
              .fail(function (jqxhr, textStatus, errorThrown) {

                  self.isSubmitting = false;
                  const response = jqxhr.responseJSON;
                  if (response.rc !== undefined && response.rc < 0) {
                      $feedbackLabel.html(response.rc_str_hr).show();
                  }

                  self.options.onSubmitError(response, dataToSend, textStatus, errorThrown);
              })
              .always(function (d) {
                  submitButton.removeAttr("disabled");
              });

          } else { // no endpoint

                  // clear the current form state
                  self.currentState = null;

                  //if (self.options.resetAfterSubmit) self.cleanForm();
                  $feedbackLabel.hide();

                  const success = self.options.onSubmitSuccess({}, dataToSend, self);
                  // if the submit return a true boolean then close the modal
                  if (success) {
                    if(self.dialog.modal)
                      self.dialog.modal('hide');
                    else
                      self.dialog[0].hidden = true;
                  }

                  /* unbind the old closure on submit event and bind a new one */
                  $(self.element).off('submit', self.submitHandler);
                  self.delegateSubmit();

                  submitButton.removeAttr("disabled");
          }
      }

      delegateResetButton() {

          const self = this;
          const resetButton = $(this.element).find(`[type='reset']`);
          if (resetButton.length == 0) return;

          const defaultValues = NtopUtils.serializeFormArray($(this.element).serializeArray());

          resetButton.click(function (e) {

              e.preventDefault();

              // reset the previous values
              $(self.element).find('input:visible,select').each(function (i, input) {
                  const key = $(input).attr('name');
                  $(input).val(defaultValues[key])
                      .removeClass('is-invalid').removeClass('is-valid');
              });
          });
      }
  }

  const modalHandler = function (args) {

      if (this.length != 1) throw new Error("Only a form element can by initialized!");

      const options = $.extend({
          csrf: '',
          endpoint: '',
          resetAfterSubmit: true,
          /* True to skip the are-you-sure check on the dialog */
          dontDisableSubmit: false,
          /* True if the request isn't done by AJAX request */
          isSyncRequest: false,
          method: 'get',
          /**
           * Fetch data asynchronusly from the server or
           * loads data directly from the current page.
           * The function must returns the fetched data.
           *
           * @returns Returns the fetched data.
           * @example Below there is an example showing
           * how to use the function when fetching data from the server
           * ```
           * loadFormData: async function() {
           *      const data = await fetch(`endpoint/to/data`);
           *      const user = await data.json();
           *      return user;
           * }
           * ```
           */
          loadFormData: function () { },

          /**
           * onModalInit() is invoked when the plugin has been initialized.
           * This function is used to load the fetched data from `loadFormData()`
           * inside the form modal inputs.
           *
           * @param {object} loadedData This argument contains the fetched data obtained
           * from `loadFormData()`
           * @example Below there is an example showing how to use
           * the function (we suppose that loadFormData() returns the following
           * object: `loadedUser = {firstname: 'Foo', lastname: 'Bar', id: 1428103}`)
           * ```
           * onModalInit: function(loadedUser) {
           *      $(`#userModal form input#firstname`).val(loadedUser.firstname);
           *      $(`#userModal form input#lastname`).val(loadedUser.lastname);
           *      $(`#userModal form input#id`).val(loadedUser.id);
           * }
           * ```
           */
          onModalInit: function (loadedData) { },

          onModalShow: function () { },

          /**
           * The function beforeSubmit() is invoked after the user
           * submit the form. The function must return the data to
           * send to the endpoint. If the chosen method is `post`
           * a csrf will be add to the returned object.
           *
           * @example We show below a simple example how to use the function:
           * ```
           * beforeSubmit: function() {
           *      const body = {
           *          action: 'edit',
           *          JSON: JSON.stringify(serializeArrayForm($(`form`).serializeArray()))
           *      };
           *      return body;
           * }
           * ```
           */
          beforeSumbit: function () { return {} },

          /**
           * This function is invoked when the request to the endpoint
           * terminates successfully (200). Before the call of this function
           * a new csrf retrived from the server will be set for
           * future calls.
           *
           * @param {object} response This object contains the response
           * from the server
           *
           * @example Below there is an example showing a simple user case:
           * ```
           * onSubmitSuccess: function(response) {
           *      if (response.success) {
           *          console.log(`The user info has been edit with success!`);
           *      }
           * }
           * ```
           */
          onSubmitSuccess: function (response) { },

          /**
           * This function is invoked when the request to the endpoint
           * terminates with failure (!= 200). Before the call of this function
           * a new csrf retrived from the server will be set for
           * future calls.
           *
           * @param {object} sent This object contains the sent data to the endpoint
           * @param {string} textStatus It contains the error text status obtained
           * @param {object} errorThrown This object contains info about the error
           *
           * @example Below there is an example showing a simple user case:
           * ```
           * onSubmitError: function(sent, textStatus, errorThrown) {
           *      if (errorThrown) {
           *          console.error(`Ops, something went wrong!`);
           *          console.error(errorThrown);
           *      }
           * }
           * ```
           */
          onSubmitError: function (sent, textStatus, errorThrown) { },

          /**
           * This function is invoked when the user click the reset input
           * inside the form.
           *
           * @param {object} defaultData It contains the fetched data from
           * `loadFormData()`.
           *
           * @example Below there is an example how to use the function:
           * ```
           * onModalReset: function(defaultData) {
           *      $(`input#id`).val(defaultData.id);
           *      $(`input#name`).val(defaultData.name);
           *      $(`input#address`).val(defaultData.address);
           * }
           * ```
           */
          onModalReset: function (defaultData) { },
      }, args);

      const mh = new ModalHandler(this, options);
      mh.delegateSubmit();

      return mh;
  };

  window.datatableInitRefreshRows = datatableInitRefreshRows;
  window.datatableForEachRow = datatableForEachRow;
  window.datatableIsEmpty = datatableIsEmpty;
  window.datatableRemoveEmptyRow = datatableRemoveEmptyRow;
  window.datatableAddEmptyRow = datatableAddEmptyRow;
  window.datatableGetNumDisplayedItems = datatableGetNumDisplayedItems;
  window.datatableGetByForm = datatableGetByForm;
  window.datatableUndoAddRow = datatableUndoAddRow;
  window.datatableAddButtonCallback = datatableAddButtonCallback;
  window.datatableAddDeleteButtonCallback = datatableAddDeleteButtonCallback;
  window.datatableAddActionButtonCallback = datatableAddActionButtonCallback;
  window.datatableAddFilterButtonCallback = datatableAddFilterButtonCallback;
  window.datatableAddLinkButtonCallback = datatableAddLinkButtonCallback;
  window.datatableMakeSelectUnique = datatableMakeSelectUnique;
  window.datatableIsLastPage = datatableIsLastPage;
  window.datatableGetColumn = datatableGetColumn;
  window.datatableGetColumnIndex = datatableGetColumnIndex;

  window.$.fn.modalHandler = modalHandler;

  window.ebpfUtils = ebpfUtils;

  function makeUniqueValidator(items_function) {
    return function(field) {
      var cmp_name = field.val();
      var count = 0;

      // this will be checked separately, with 'required' argument
      if(! cmp_name)
        return true;

      items_function(field).each(function() {
        var name = $(this).val();
        if (name == cmp_name)
          count = count + 1;
      });

      return count == 1;
    }
  }

  function memberValueValidator(input) {
    var member = input.val();
    if (member === "") return true;

    return NtopUtils.is_mac_address(member) || NtopUtils.is_network_mask(member, true);
  }

  function makePasswordPatternValidator(pattern) {
    return function passwordPatternValidator(input) {
      // required is checked separately
      if(!input.val()) return true;
      return $(input).val().match(pattern);
    }
  }

  function passwordMatchValidator(input) {
    var other_input = $(input).closest("form").find("[data-passwordmatch]").not(input);
    if(!input.val() || !other_input.val()) return true;
    return other_input.val() === input.val();
  }

  function poolnameValidator(input) {
    // required is checked separately
    if(!input.val()) return true;
    return $(input).val().match(/^[a-z0-9_]*$/);
  }

  function passwordMatchRecheck(form) {
    var items = $(form).find("[data-passwordmatch]");
    var not_empty = 0;

    items.each(function() {
      if($(this).val() != "") not_empty++;
    });

    if(not_empty == items.length) items.trigger('input');
  }

  function hostOrMacValidator(input) {
    var host = input.val();

    /* Handled separately */
    if (host === "") return true;

    return NtopUtils.is_mac_address(host) || NtopUtils.is_good_ipv4(host) || NtopUtils.is_good_ipv6(host);
  }

  function ipAddressValidator(input) {
    var host = input.val();

    /* Handled separately */
    if (host === "") return true;

    return NtopUtils.is_good_ipv4(host) || NtopUtils.is_good_ipv6(host);
  }

  var filters_to_validate = {};

  function bpfValidator(filter_field, sync = false) {
    var filter = filter_field.val();

    if (filter.trim() === "") {
      return true;
    }

    var key = filter_field.attr("name");
    var timeout = 250;

    if (!filters_to_validate[key])
       filters_to_validate[key] = {ajax_obj:null, valid:true, timer:null, submit_remind:false, last_val:null};
    var status = filters_to_validate[key];

    var sendAjax = function () {
      status.timer = null;

      var finally_check = function (valid) {
        status.ajax_obj = null;
        status.valid = valid;
        status.last_val = filter;
      };

      if (status.last_val !== filter) {
        if (status.ajax_obj)
          status.ajax_obj.abort();

        status.ajax_obj = $.ajax({
          type: "GET",
          url: `${http_prefix}/lua/pro/rest/v2/check/filter.lua`,
          async: !sync,
          data: {
            query: filter,
          }, error: function() {
            finally_check(status.valid);
          }, success: function(data) {
            var valid = data.response ? true : false;
            finally_check(valid);
          }
        });
      } else {
        // possibly process the reminder
        finally_check(status.valid);
      }
    };

    if (sync) {
      sendAjax();
    } else if (status.last_val === filter) ; else {
      if (status.timer) {
        clearTimeout(status.timer);
        status.submit_remind = false;
      }
      status.timer = setTimeout(sendAjax, timeout);
    }

    return status.valid;
  }

  window.makeUniqueValidator = makeUniqueValidator;
  window.memberValueValidator = memberValueValidator;
  window.makePasswordPatternValidator = makePasswordPatternValidator;
  window.passwordMatchValidator = passwordMatchValidator;
  window.poolnameValidator = poolnameValidator;
  window.passwordMatchRecheck = passwordMatchRecheck;
  window.hostOrMacValidator = hostOrMacValidator;
  window.ipAddressValidator = ipAddressValidator;
  window.bpfValidator = bpfValidator;

  /**
      (C) 2022 - ntop.org    
  */

  const ntopng_sync$1 = function() {
      let components_ready = {};
      let subscribers = [];        
      return {
  	ready: function(component_name) {
  	    components_ready[component_name] = true;
  	    subscribers.filter((s) => s.component_name == component_name).forEach((s) => s.resolve());
  	    subscribers = subscribers.filter((s) => s.component_name != component_name);
  	},
  	on_ready: function(component_name) {
  	    return new Promise((resolve, rejevt) => {
  		if (components_ready[component_name]) {
  		    resolve();
  		    return;
  		}
  		subscribers.push({resolve, component_name, completed: false});
  	    });
  	},
      };
  }();

  /**
  * Utility globals functions.
  */
  const ntopng_utility$1 = function() {

    return {	
        /**
         * Deep copy of a object.
         * @param {object} obj.
         * @returns {object}.
         */
        clone: function(obj) {
            if (obj == null) { return null; }
            return JSON.parse(JSON.stringify(obj));
        },
  object_to_array: function(obj) {
      if (obj == null) { return []; }
      let array = [];
      for (let key in obj) {
    array.push(obj[key]);
      }
      return array;
  },
        from_utc_to_server_date_format: function(utc_ms, format) {
  	  if (format == null) { format = "DD/MMM/YYYY HH:mm"; }
  	  let m = moment.tz(utc_ms, ntop_zoneinfo);
  	  let m_local = moment(utc_ms);
  	  m_local.format(format);
  	  let tz_server = m.format(format);
  	  return tz_server;
        },
  is_object: function(e) {
    return typeof e === 'object'
      && !Array.isArray(e)
      && e !== null;
  },
  copy_object_keys: function(source_obj, dest_obj, recursive_object = false) {
    if (source_obj == null) {
      return;
    }
      for (let key in source_obj) {
  	if (source_obj[key] == null) { continue; }
      if (recursive_object == true && this.is_object(source_obj[key]) && this.is_object(dest_obj[key])) {
        this.copy_object_keys(source_obj[key], dest_obj[key], recursive_object);
      } else {
        dest_obj[key] = source_obj[key];
      }
    }
  },
  http_request: async function(url, options, throw_exception, not_unwrap) {
      try {
    let res = await fetch(url, options);
    if (res.ok == false) {
        console.error(`http_request ${url}\n ok == false`);
        console.error(res);
        return null;
    }
    let json_res = await res.json();
  	if (not_unwrap == true) { return json_res; }
    return json_res.rsp;
      } catch (err) {
    console.error(err);
    if (throw_exception == true) { throw err; }
    return null;
      }
  },
    }
  }();

  /**
  * Allows to manage the application global status.
  * The status is incapsulated into the url.
  */
  const ntopng_status_manager$1 = function() {
    let gloabal_status = {};
    /** @type {{ [id: string]: (status: object) => void}} */
    let subscribers = {}; // dictionary of { [id: string]: f_on_ntopng_status_change() }
    const clone = ntopng_utility$1.clone;

    const relplace_global_status = function(status) {
  gloabal_status = status;
    };
    /**
     * Notifies the status to all subscribers with id different from skip_id.
     * @param {object} status object that represent the application status.
     * @param {string} skip_id if != null doesn't notify the subscribers with skip_id identifier.
     */
    const notify_subscribers = function(status, skip_id) {
        for (let id in subscribers) {
            if (id == skip_id) { continue; }
            let f_on_change = subscribers[id];
            f_on_change(clone(status));
        }
    };

    return {	
        /**
         * Gets the current global application status.
         * @returns {object}
         */
        get_status: function() {
      return clone(gloabal_status);
        },

  update_subscribers: function() {
      const status = this.get_status();
      notify_subscribers(status);
  },

        /**
         * Allows to subscribers f_on_change callback on status change event.
         * @param {string} id an identifier of the subscribtion. 
         * @param {(status:object) => void} f_on_change callback that take object status as param.
         * @param {boolean} get_init_notify if true the callback it's immediately called with the last status available.
         */
        on_status_change: function(id, f_on_change, get_init_notify) {
            subscribers[id] = f_on_change;
            if (get_init_notify == true) {
                let status = this.get_status();
                f_on_change(clone(status));
            }
        },

        /**
         * Raplaces the application status and notifies the new status to all subscribers.
         * Notifies the new status to all subscribers.
         * @param {Object} status object that represent the application status.
         * @param {string} skip_id if != null doesn't notify the subscribers with skip_id identifier.
         */
        replace_status: function(status, skip_id) {
      relplace_global_status(status);
            notify_subscribers(status, skip_id);
        },

        /**
         * Adds or replaces all obj param keys to the application status.
         * Notifies the new status to all subscribers.
         * @param {Object} obj object to add or edit to the application status. 
         * @param {string} skip_id if != null doesn't notify the subscribers with skip_id identifier.
         */
        add_obj_to_status: function(obj, skip_id) {
            let new_status = this.get_status();
      ntopng_utility$1.copy_object_keys(obj, new_status);
            this.replace_status(new_status, skip_id);
        },

        /**
         * Adds or replaces the value key to the application status.
         * Notifies the new status to all subscribers.
         * @param {string} key key to adds or replaces.
         * @param {any} value value to adds or replaces.
         * @param {*} skip_id if != null doesn't notify the subscribers with skip_id identifier.
         */
        add_value_to_status: function(key, value, skip_id) {
            let new_status = this.get_status();
            new_status[key] = value;
            // /* This is needed to have muliple filters for the same key */
            // (new_status[key] && new_status[key].search(value) === -1) ? new_status[key] += "," + value : new_status[key] = value
            
            this.replace_status(new_status, skip_id);
        },
    }
  }();

  const ntopng_params_url_serializer = {
    // filters: function(key, filters) {
    // 	if (filters == null) { return ""; }
    // 	let filters_groups = {};
    // 	filters.forEach((f) => {
    // 	    let group = filters_groups[f.id];
    // 	    if (group == null) {
    // 		group = [];
    // 		filters_groups[f.id] = group;
    // 	    }
    // 	    group.push(f);
    // 	});
    // 	let url_params_array = [];
    // 	for (let f_id in filters_groups) {
    // 	    let group = filters_groups[f_id];
    // 	    let url_values = group.filter((f) => f.value != null && f.operator != null && f.operator != "").map((f) => `${f.value};${f.operator}`).join(",");
    // 	    let url_params = ntopng_url_manager.serialize_param(f_id, url_values);
    // 	    url_params_array.push(url_params);
    // 	}
    // 	return url_params_array.join("&");
    // },
  };

  const ntopng_url_manager$1 = function() {
    /** @type {{ [key: string]: (obj: any) => string}} */
    let custom_params_serializer = {};
    ntopng_utility$1.copy_object_keys(ntopng_params_url_serializer, custom_params_serializer);
    
    return {
  get_url_params: function() {
      return window.location.search.substring(1);
  },
  get_url_search_params: function(url) {
      if (url == null) {
    url = this.get_url_params();
      }
      // for(const [key, value] of entries) {
            const url_params = new URLSearchParams(url);
      return url_params;
  },
  get_url_entries: function(url) {
            const url_params = this.get_url_search_params(url);
            const entries = url_params.entries();
      return entries;
  },	
  get_url_entry: function(param_name) {
      let entries = this.get_url_entries();
      for(const [key, value] of entries) {
    if (key == param_name) { return value; }
      }
      return null;
  },
  get_url_object: function(url) {
      let entries = this.get_url_entries(url);
      let obj = {};
      for (const [key, value] of entries) {
    obj[key] = value;
      }
      return obj;
  },
  reload_url: function() {
      window.location.reload();
  },
  replace_url: function(url_params) {
            window.history.replaceState({}, null, `?${url_params}`);
  },
  replace_url_and_reload: function(url_params) {
      this.replace_url(url_params);
      this.reload_url();
  },
  serialize_param: function(key, value) {
      if (value == null) {
    value = "";
      }
      return `${key}=${encodeURIComponent(value)}`;
  },	
  set_custom_key_serializer: function(key, f_get_url_param) {
      custom_params_serializer[key] = f_get_url_param;
  },

  /**
   * Convert js object into a string that represent url params.
   * Uses custom serializer if set.
   * @param {object} obj.
   * @returns {string}.
   */
  obj_to_url_params: function(obj) {
      let params = [];
      const default_serializer = this.serialize_param;
      for (let key in obj) {
    let serializer = custom_params_serializer[key];
    if (serializer == null) {
        serializer = default_serializer;
    }
    let param = serializer(key, obj[key]);
    params.push(param);
      }
      let url_params = params.join("&");
            return url_params;
  },
  delete_params: function(params_key) {
      let search_params = this.get_url_search_params();
      params_key.forEach((p) => {
    search_params.delete(p);
      });
      this.replace_url(search_params.toString());	    
  },
  set_key_to_url: function(key, value) {
      if (value == null) { value = ""; }	  
      let search_params = this.get_url_search_params();
      search_params.set(key, value);
      this.replace_url(search_params.toString());
  },
  add_obj_to_url: function(url_params_obj) {
      let new_url_params = this.obj_to_url_params(url_params_obj);
      let search_params = this.get_url_search_params();
      let new_entries = this.get_url_entries(new_url_params);
      for (const [key, value] of new_entries) {
    search_params.set(key, value);
      }
      this.replace_url(search_params.toString());
  },
    }
  }();
    
  /**
  * Object that represents a list of prefedefined events that represent the status.
  */
  const ntopng_events$1 = {
    EPOCH_CHANGE: "epoch_change", // { epoch_begin: number, epoch_end: number }
    FILTERS_CHANGE: "filters_change", // {filters: {id: string, operator: string, value: string}[] }
  };

  const ntopng_events_compare = {
    EPOCH_CHANGE: function(new_status, old_status) {
  return new_status.epoch_begin != old_status.epoch_begin
      || new_status.epoch_end != old_status.epoch_end;
    },
    FILTERS_CHANGE: function(new_status, old_status) {	
  return (new_status.filters == null && old_status.filters != null)
      || (new_status.filters != null && old_status.filters == null)
      || (new_status.filters != null && old_status.filters != null &&
    (
        (new_status.filters.length != old_status.filters.length)
      || (new_status.filters.some((f_new) => old_status.filters.find((f_old) => f_old.id == f_new.id) == null))
    )
         );
    },
  };

  /**
  * Object that represents a list of prefedefined custom events.
  */
  const ntopng_custom_events$1 = {
    SHOW_MODAL_FILTERS: "show_modal_filters", // {id: string, operator: string, value: string}
    MODAL_FILTERS_APPLY: "modal_filters_apply", // {id: string, label: string, operator: string, value: string, value_label: string}
      SHOW_GLOBAL_ALERT_INFO: "show_global_alert_info", // html_text: string
  };


  /**
  * A global events service that allows to manage the application global status.
  * The status is incapsulated into the url.
  */
  const ntopng_events_manager$1 = function() {
    const events_manager_id = "events_manager";
    let status = {};

    /** @type {{ [event_name: string]: { [id: string]: (status: object) => void}}} */
    let events_subscribers = {}; // dictionary of { [event_name: string]: { [id: string]: f_on_event }

    const clone = ntopng_utility$1.clone;

    /**
     * Notifies the status to all subscribers with id different from skip_id.
     * @param {{ [id: string]: (status: object) => void}} subscribers dictionary of id => f_on_event().
     * @param {object} status object that represent the application status.
     * @param {string} skip_id if != null doesn't notify the subscribers with skip_id identifier.
     */
    const notify_subscribers = function(subscribers, status, skip_id) {
        for (let id in subscribers) {
            if (id == skip_id) { continue; }
            let f_on_change = subscribers[id];
            f_on_change(clone(status));
        }
    };

    /**
     * A callback that dispatches each event to all subscribers.
     * @param {object} new_status 
     */
    const on_status_change = function(new_status) {
  for (let event_name in ntopng_events$1) {
      let f_compare = ntopng_events_compare[event_name];
      if (f_compare(new_status, status) == true) {
    let subscribers = events_subscribers[event_name];
    notify_subscribers(subscribers, new_status);
      }
  }

        status = new_status;
    };

    ntopng_status_manager$1.on_status_change(events_manager_id, on_status_change, true);

    const emit = function(event, params, skip_id) {
  let subscribers = events_subscribers[event];
  if (subscribers == null) { return; }
  notify_subscribers(subscribers, params, skip_id);
    };

    const on_event = function(id, event, f_on_event, get_init_notify) {
        if (events_subscribers[event] == null) {
            events_subscribers[event] = {};        
        }
        if (get_init_notify == true) {
            let status = ntopng_status_manager$1.get_status();        
            f_on_event(clone(status));
        }
        events_subscribers[event][id] = f_on_event;
    };

    return {
  emit_custom_event: function(event, params) {
      emit(event, params);
  },
  on_custom_event: function(id, event, f_on_event) {
      on_event(id, event, f_on_event);
  },
        /**
         * Changes the application status and emits the new status to all subcribers registered to the event. 
         * @param {string} event event name.
         * @param {object} new_status object to add or edit to the application status.
         * @param {string} skip_id if != null doesn't notify the subscribers with skip_id identifier.
         */
        emit_event: function(event, new_status, skip_id) {
      emit(event, new_status, skip_id);
            ntopng_status_manager$1.add_obj_to_status(new_status, events_manager_id);
        },
        /**
         * Allows to subscribers f_on_event callback on status change on event event_name.
         * @param {string} id an identifier of the subscribtion. 
         * @param {string} event event name. 
         * @param {(status:object) => void} f_on_event callback that take object status as param.
         * @param {boolean} get_init_notify if true the callback it's immediately called with the last status available.
         */
        on_event_change: function(id, event, f_on_event, get_init_notify) {
      on_event(id, event, f_on_event, get_init_notify);
        },
    }    
  }();

  window.ntopng_events = ntopng_events$1;
  window.ntopng_events_manager = ntopng_events_manager$1;
  window.ntopng_status_manager = ntopng_status_manager$1;
  window.ntopng_utility = ntopng_utility$1;
  window.ntopng_url_manager = ntopng_url_manager$1;
  window.ntopng_sync = ntopng_sync$1;
  window.ntopng_custom_events = ntopng_custom_events$1;

  // http://jsfiddle.net/stephenboak/hYuPb/

  // Wrapper function
  function do_pie(name, update_url, url_params, units, refresh) {
  	var pie = new PieChart(name, update_url, url_params, units, refresh);
  	if (refresh)
  		pie.setInterval(setInterval(function () { pie.update(); }, refresh));

  	// Return new class instance, with
  	return pie;
  }

  function PieChart(name, update_url, url_params, units, refresh) {

  	// Add object properties like this
  	this.name = name;
  	this.update_url = update_url;
  	this.url_params = url_params;
  	this.units = units;
  	this.refresh = refresh;
  	this.pieInterval;

    let streakerDataAdded = [];
    let paths = "";
    let lines = [];
    let valueLabels = [];
    let nameLabels = [];

  	var pieData = [];
  	var oldPieData = [];
  	var filteredPieData = [];
  	var rsp = create_pie_chart(name, units);
  	var arc_group = rsp[0];
  	var donut = rsp[1];
  	var totalValue = rsp[2];
  	var color = rsp[4];
  	var tweenDuration = rsp[5];
  	var arc = rsp[6];
  	var label_group = rsp[7];
  	var r = rsp[9];
  	var textOffset = rsp[10];


  	// to run each time data is generated

  	this.update = function () {
  		// console.log(this.name);
  		// console.log(this.url_params);
  		$.ajax({
  			type: 'GET',
  			url: this.update_url,
  			data: this.url_params,
  			success: function (content) {
  				let parsed_content;

  				if (typeof (content) == "object")
  					parsed_content = content;
  				else if (typeof (content) == "string")
  					parsed_content = jQuery.parseJSON(content);

  				if (parsed_content)
  					update_pie_chart(parsed_content);
  			}
  		});
  	};

  	///////////////////////////////////////////////////////////
  	// STREAKER CONNECTION ////////////////////////////////////
  	///////////////////////////////////////////////////////////

  	// Needed to draw the pie immediately
  	this.update();
  	this.update();

  	// var updateInterval = window.setInterval(update, refresh);

  	function compare_by_label(a, b) {
  		if (a.label < b.label) {
  			return -1;
  		} else if (a.label > b.label) {
  			return 1;
  		} else {
  			return 0;
  		}
  	}

  	function update_pie_chart(data) {
  		if (data.rsp) // detect REST API v1
  			data = data.rsp;

  		data.sort(compare_by_label);
  		streakerDataAdded = data;
  		oldPieData = filteredPieData;
  		pieData = donut(streakerDataAdded);

  		var totalOctets = 0;
  		filteredPieData = pieData.filter(filterData);
  		function filterData(element, index, array) {
  			element.name = streakerDataAdded[index].label;
  			element.value = streakerDataAdded[index].value;
  			element.url = streakerDataAdded[index].url;
  			totalOctets += element.value;
  			return (element.value > 0);
  		}

  		if ((filteredPieData.length > 0) && (oldPieData.length > 0)) {
  			//REMOVE PLACEHOLDER CIRCLE
  			arc_group.selectAll("circle").remove();

  			if (totalValue) {
  				totalValue.text(function () {
  					var kb = totalOctets / 1024;
  					return kb.toFixed(1);
  					//return bchart.label.abbreviated(totalOctets*8);
  				});
  			}

  			//DRAW ARC PATHS
  			paths = arc_group.selectAll("path").data(filteredPieData);
  			paths.enter().append("svg:path")
  				.attr("stroke", "white")
  				.attr("stroke-width", 0.5)
  				.attr("fill", function (d, i) { return color(i); })
  				.transition()
  				.duration(tweenDuration)
  				.attrTween("d", pieTween);
  			paths
  				.transition()
  				.duration(tweenDuration)
  				.attrTween("d", pieTween);
  			paths.exit()
  				.transition()
  				.duration(tweenDuration)
  				.attrTween("d", removePieTween)
  				.remove();

  			//DRAW TICK MARK LINES FOR LABELS
  			lines = label_group.selectAll("line").data(filteredPieData);
  			lines.enter().append("svg:line")
  				.attr("x1", 0)
  				.attr("x2", 0)
  				.attr("y1", -r - 3)
  				.attr("y2", -r - 8)
  				.attr("stroke", "gray")
  				.attr("transform", function (d) {
  					return "rotate(" + (d.startAngle + d.endAngle) / 2 * (180 / Math.PI) + ")";
  				});
  			lines.transition()
  				.duration(tweenDuration)
  				.attr("transform", function (d) {
  					return "rotate(" + (d.startAngle + d.endAngle) / 2 * (180 / Math.PI) + ")";
  				});
  			lines.exit().remove();

  			//DRAW LABELS WITH PERCENTAGE VALUES
  			valueLabels = label_group.selectAll("text.value").data(filteredPieData)
  				.attr("dy", function (d) {
  					if ((d.startAngle + d.endAngle) / 2 > Math.PI / 2 && (d.startAngle + d.endAngle) / 2 < Math.PI * 1.5) {
  						return 5;
  					} else {
  						return -7;
  					}
  				})
  				.attr("text-anchor", function (d) {
  					if ((d.startAngle + d.endAngle) / 2 < Math.PI) {
  						return "beginning";
  					} else {
  						return "end";
  					}
  				})
  				.text(function (d) {

  					const percentage = (d.value / totalOctets) * 100;
  					// approssimate the number to the third deciaml digit and show only the first decimal
  					let percentageLabel = percentage.toFixed(1) + "%";
  					return percentageLabel;
  				});

  			valueLabels.enter().append("svg:text")
  				.attr("class", "value")
  				.attr("transform", function (d) {
  					return "translate(" + Math.cos(((d.startAngle + d.endAngle - Math.PI) / 2)) * (r + textOffset) + "," + Math.sin((d.startAngle + d.endAngle - Math.PI) / 2) * (r + textOffset) + ")";
  				})
  				.attr("dy", function (d) {
  					if ((d.startAngle + d.endAngle) / 2 > Math.PI / 2 && (d.startAngle + d.endAngle) / 2 < Math.PI * 1.5) {
  						return 5;
  					} else {
  						return -7;
  					}
  				})
  				.attr("text-anchor", function (d) {
  					if ((d.startAngle + d.endAngle) / 2 < Math.PI) {
  						return "beginning";
  					} else {
  						return "end";
  					}
  				}).text(function (d) {
  					if (totalOctets <= 1) return "";
  					const percentage = (d.value / totalOctets) * 100;
  					let percentageLabel = percentage.toFixed(1) + "%";
  					return percentageLabel;
  				});

  			valueLabels.transition().duration(tweenDuration).attrTween("transform", textTween);
  			valueLabels.exit().remove();

  			//DRAW LABELS WITH ENTITY NAMES
  			nameLabels = label_group.selectAll("text.units").data(filteredPieData)
  				.attr("dy", function (d) {
  					if ((d.startAngle + d.endAngle) / 2 > Math.PI / 2 && (d.startAngle + d.endAngle) / 2 < Math.PI * 1.5) {
  						return 17;
  					} else {
  						return 5;
  					}
  				})
  				.attr("text-anchor", function (d) {
  					if ((d.startAngle + d.endAngle) / 2 < Math.PI) {
  						return "beginning";
  					} else {
  						return "end";
  					}
  				}).text(function (d) {
  					return d.name;
  				})
  				.on("click", function (d) { if (d.url) window.location.href = d.url; });

  			nameLabels.enter().append("svg:text")
  				.attr("class", "units")
  				.attr("transform", function (d) {
  					return "translate(" + Math.cos(((d.startAngle + d.endAngle - Math.PI) / 2)) * (r + textOffset) + "," + Math.sin((d.startAngle + d.endAngle - Math.PI) / 2) * (r + textOffset) + ")";
  				})
  				.attr("dy", function (d) {
  					if ((d.startAngle + d.endAngle) / 2 > Math.PI / 2 && (d.startAngle + d.endAngle) / 2 < Math.PI * 1.5) {
  						return 17;
  					} else {
  						return 5;
  					}
  				})
  				.attr("text-anchor", function (d) {
  					if ((d.startAngle + d.endAngle) / 2 < Math.PI) {
  						return "beginning";
  					} else {
  						return "end";
  					}
  				}).text(function (d) {
  					return d.name;
  				})
  				.on("click", function (d) { if (d.url) window.location.href = d.url; });

  			nameLabels.transition().duration(tweenDuration).attrTween("transform", textTween);

  			nameLabels.exit().remove();
  		}
  	}

  	///////////////////////////////////////////////////////////
  	// FUNCTIONS //////////////////////////////////////////////
  	///////////////////////////////////////////////////////////

  	// Interpolate the arcs in data space.
  	function pieTween(d, i) {
  		var s0;
  		var e0;
  		if (oldPieData[i]) {
  			s0 = oldPieData[i].startAngle;
  			e0 = oldPieData[i].endAngle;
  		} else if (!(oldPieData[i]) && oldPieData[i - 1]) {
  			s0 = oldPieData[i - 1].endAngle;
  			e0 = oldPieData[i - 1].endAngle;
  		} else if (!(oldPieData[i - 1]) && oldPieData.length > 0) {
  			s0 = oldPieData[oldPieData.length - 1].endAngle;
  			e0 = oldPieData[oldPieData.length - 1].endAngle;
  		} else {
  			s0 = 0;
  			e0 = 0;
  		}
  		var i = d3.interpolate({ startAngle: s0, endAngle: e0 }, { startAngle: d.startAngle, endAngle: d.endAngle });
  		return function (t) {
  			var b = i(t);
  			return arc(b);
  		};
  	}

  	function removePieTween(d, i) {
  		s0 = 2 * Math.PI;
  		e0 = 2 * Math.PI;
  		var i = d3.interpolate({ startAngle: d.startAngle, endAngle: d.endAngle }, { startAngle: s0, endAngle: e0 });
  		return function (t) {
  			var b = i(t);
  			return arc(b);
  		};
  	}

  	function textTween(d, i) {
  		var a;
  		if (oldPieData[i]) {
  			a = (oldPieData[i].startAngle + oldPieData[i].endAngle - Math.PI) / 2;
  		} else if (!(oldPieData[i]) && oldPieData[i - 1]) {
  			a = (oldPieData[i - 1].startAngle + oldPieData[i - 1].endAngle - Math.PI) / 2;
  		} else if (!(oldPieData[i - 1]) && oldPieData.length > 0) {
  			a = (oldPieData[oldPieData.length - 1].startAngle + oldPieData[oldPieData.length - 1].endAngle - Math.PI) / 2;
  		} else {
  			a = 0;
  		}
  		var b = (d.startAngle + d.endAngle - Math.PI) / 2;

  		var fn = d3.interpolateNumber(a, b);
  		return function (t) {
  			var val = fn(t);
  			return "translate(" + Math.cos(val) * (r + textOffset) + "," + Math.sin(val) * (r + textOffset) + ")";
  		};
  	}

  }

  ///////////////////////////////////////////////////////////
  // PUBLIC FUNCIONTS ////////////////////////////////////
  ///////////////////////////////////////////////////////////


  PieChart.prototype.setUrlParams = function (url_params) {
  	this.url_params = url_params;
  	this.forceUpdate();
  };

  PieChart.prototype.forceUpdate = function (url_params) {
  	this.stopInterval();
  	this.update();
  	this.startInterval();
  };

  PieChart.prototype.setInterval = function (p_pieInterval) {
  	this.pieInterval = p_pieInterval;
  };

  PieChart.prototype.stopInterval = function () {
  	//disabled graph interval
  	clearInterval(this.pieInterval);
  };

  PieChart.prototype.startInterval = function () {
  	this.pieInterval = setInterval(this.update(), this.refresh);
  };
  ///////////////////////////////////////////////////////////
  // INIT FUNCIONTS ////////////////////////////////////
  ///////////////////////////////////////////////////////////

  function create_pie_chart(name, units) {
  	var w = 500; //380 - Please keep in sync with pie-chart.css
  	var h = 325; //280
  	var ir = 52; //45
  	var textOffset = 14;
  	var tweenDuration = 250;
  	var r = 116; //100;

  	if ($(name).hasClass("pie-chart-small")) {
  		w = 330;
  		h = 250;
  		r = w / 5 + 15;
  		ir = r / 2;
  	}

  	//D3 helper function to populate pie slice parameters from array data
  	var donut = d3.layout.pie().value(function (d) {
  		if (d.value == 0) { d.value = 1; } // Force to 1, in order to update the graph
  		return d.value;
  	});

  	//D3 helper function to create colors from an ordinal scale
  	var color = d3.scale.category20();

  	//D3 helper function to draw arcs, populates parameter "d" in path object
  	var arc = d3.svg.arc()
  		.startAngle(function (d) { return d.startAngle; })
  		.endAngle(function (d) { return d.endAngle; })
  		.innerRadius(ir)
  		.outerRadius(r);

  	///////////////////////////////////////////////////////////
  	// CREATE VIS & GROUPS ////////////////////////////////////
  	///////////////////////////////////////////////////////////

  	var vis = d3.select(name).append("svg:svg")
  		.attr("width", w)
  		.attr("height", h)
  		.attr("viewBox", "0 0 " + w + " " + h)
  		.attr("preserveAspectRatio", "xMidYMid");

  	//GROUP FOR ARCS/PATHS
  	var arc_group = vis.append("svg:g")
  		.attr("class", "arc")
  		.attr("transform", "translate(" + (w / 2) + "," + (h / 2) + ")");

  	//GROUP FOR LABELS
  	var label_group = vis.append("svg:g")
  		.attr("class", "label_group")
  		.attr("transform", "translate(" + (w / 2) + "," + (h / 2) + ")");

  	//GROUP FOR CENTER TEXT
  	var center_group = vis.append("svg:g")
  		.attr("class", "center_group")
  		.attr("transform", "translate(" + (w / 2) + "," + (h / 2) + ")");

  	//PLACEHOLDER GRAY CIRCLE
  	arc_group.append("svg:circle")
  		.attr("fill", "#EFEFEF")
  		.attr("r", r);

  	///////////////////////////////////////////////////////////
  	// CENTER TEXT ////////////////////////////////////////////
  	///////////////////////////////////////////////////////////

  	//WHITE CIRCLE BEHIND LABELS
  	center_group.append("svg:circle")
  		.attr("fill", "white")
  		.attr("r", ir);

  	var totalUnits = null;
  	var totalValue = null;

  	if (units) {
  		// "TOTAL" LABEL
  		center_group.append("svg:text")
  			.attr("class", "label")
  			.attr("dy", -15)
  			.attr("text-anchor", "middle") // text-align: right
  			.text("TOTAL");

  		//TOTAL TRAFFIC VALUE
  		totalValue = center_group.append("svg:text")
  			.attr("class", "total")
  			.attr("dy", 7)
  			.attr("text-anchor", "middle") // text-align: right
  			.text("Waiting...");

  		//UNITS LABEL
  		totalUnits = center_group.append("svg:text")
  			.attr("class", "units")
  			.attr("dy", 21)
  			.attr("text-anchor", "middle") // text-align: right
  			.text(units);
  	}

  	return ([arc_group, donut, totalValue, totalUnits, color, tweenDuration, arc, label_group, center_group, r, textOffset]);
  }

  /**
   * (C) 2013-21 - ntop.org
   */

  const DEFINED_WIDGETS = {};
  /* Used to implement the on click events onto the graph */
  const DEFINED_EVENTS = {
      /* On click event used by the flow analyze section, redirect to the current url + a single filter */
      "db_analyze" : function (event, chartContext, config) {
          const { dataPointIndex } = config;
          const { filter } = config.w.config;
          let value;

          if(config.w.config.filtering_labels)
              value = config.w.config.filtering_labels[dataPointIndex];

          if(config.w.config.labels)
              config.w.config.labels[dataPointIndex];

          if(filter.length == 0 || value === undefined)
              return;

          let status = ntopng_status_manager.get_status();
          let filters = status.filters;
          filters.push({id: filter[0], operator: "eq", value: value});
          // notify that filters status is updated
          ntopng_events_manager.emit_event(ntopng_events.FILTERS_CHANGE, {filters});
      },

      "none" : function (event, chartContext, config) {
          return;
      },
      
      /* Standard on click event, redirect to the url */
      "standard" : function (event, chartContext, config) {
          const { seriesIndex, dataPointIndex } = config;
          const { series } = config.w.config;
          if (seriesIndex === -1) return;
          if (series === undefined) return;

          const serie = series[seriesIndex];
          if (serie.base_url !== undefined) {
              const search = serie.data[dataPointIndex].meta.url_query;
              location.href = `${serie.base_url}?${search}`;
          }
      },
  };

  const DEFINED_TOOLTIP = {
      /* On click event used by the flow analyze section, redirect to the current url + a single filter */
      "format_bytes" : function(value, { config, seriesIndex, dataPointIndex }) {
          return NtopUtils.bytesToSize(value);
      },

      "format_pkts" : function(value, { config, seriesIndex, dataPointIndex }) {
          return NtopUtils.formatPackets(value);
      },

      /* On click event used by the flow analyze section, redirect to the current url + a single filter */
      "format_value" : function(value, { config, seriesIndex, dataPointIndex }) {
          return NtopUtils.formatValue(value);
      },

      "format_multiple_date" : function(value, { config, seriesIndex, dataPointIndex }) {
          return new Date(value[0]) + " - " + new Date(value[1])
      },

      /*
       *  This formatter is used by the bubble host map, from the y axis,
       *  used to show the Hosts, with their respective values 
       */
      "format_label_from_xy" : function({series, seriesIndex, dataPointIndex, w}) {
          const serie = w.config.series[seriesIndex]["data"][dataPointIndex];
          
          const x_value = serie["x"];
          const y_value = serie["y"];
          const host_name = serie["meta"]["label"];

          const x_axis_title = w.config.xaxis.title.text;
          const y_axis_title = w.config.yaxis[0].title.text;

          return (`
            <div class='apexcharts-theme-light apexcharts-active' id='test'>
                <div class='apexcharts-tooltip-title' style='font-family: Helvetica, Arial, sans-serif; font-size: 12px;'>
                    ${host_name}
                </div>
                <div class='apexcharts-tooltip-series-group apexcharts-active d-block'>
                    <div class='apexcharts-tooltip-text text-left'>
                        <b>${x_axis_title}</b>: ${x_value}
                    </div>
                    <div class='apexcharts-tooltip-text text-left'>
                        <b>${y_axis_title}</b>: ${y_value}
                    </div>
                </div>
            </div>`)
      },
  };

  /* Standard Formatter */
  const DEFAULT_FORMATTER = DEFINED_TOOLTIP["format_value"];

  class WidgetUtils {

      static registerWidget(widget) {
          if (widget === null) throw new Error(`The passed widget reference is null!`);
          if (widget.name in DEFINED_WIDGETS) throw new Error(`The widget ${widget.name} is already defined!`);
          DEFINED_WIDGETS[widget.name] = widget;
      }

      static getWidgetByName(widgetName) {
          if (widgetName in DEFINED_WIDGETS) {
              return DEFINED_WIDGETS[widgetName];
          }
          throw new Error(`Widget ${widgetName} not found!`)
      }
  }

  /**
   * Define a simple wrapper class for the widgets.
   */
  class Widget {

      constructor(name, datasource = {}, updateTime = 0, additionalParams = {}) {

          // field containing the data fetched from the datasources provided
          this._fetchedData = [];

          this.name = name;

          // if 0 then don't update the chart automatically, the time
          // is expressed in milliseconds
          this._updateTime = updateTime;

          this._datasource = datasource;
          this._additionalParams = additionalParams;
      }

      /**
       * Init the widget.
       */
      async init() {

          // register the widget to the DEFINED_WIDGETS object
          WidgetUtils.registerWidget(this);
          this._fetchedData = await this._fetchData();

          if (this._updateTime > 0) {
              setInterval(async () => { await this.update(this._datasource.params); }, this._updateTime);
          }
      }

      /**
       * Destroy the widget freeing the resources used.
       */
      async destroy() { }

      /**
       * Force the widget to reload it's data.
       */
      async destroyAndUpdate(datasourceParams = {}) {
          await this.destroy();
          await this.update(datasourceParams);
      }

      async updateByUrl(url) {
        const u = new URL(`${location.origin}${this._datasource.name}`);
        let entries = ntopng_url_manager.get_url_entries(url);
        for (const [key, value] of entries) {
            u.searchParams.set(key, value);
        }
        this._datasource.endpoint = u.pathname + u.search;
        this._fetchedData = await this._fetchData();
      }
    
      async update(datasourceParams = {}) {
  	// build the new endpoint
          const u = new URL(`${location.origin}${this._datasource.name}`);

          for (const [key, value] of Object.entries(datasourceParams)) {
              u.searchParams.set(key, value);
          }

          this._datasource.endpoint = u.pathname + u.search;
          this._fetchedData = await this._fetchData();
      }

      /**
       * For each datasources provided to the constructor,
       * do a GET request to a REST endpoint.
       */
      async _fetchData() {
          const req = await fetch(`${http_prefix}${this._datasource.endpoint}`);
          return await req.json();
      }

  }

  class ChartWidget extends Widget {

      constructor(name, type = 'line', datasource = {}, updateTime = 0, additionalParams = {}) {
          super(name, datasource, updateTime, additionalParams);

          this._chartType = type;
          this._chart = {};
          this._$htmlChart = document.querySelector(`#canvas-widget-${name}`);
      }

      static registerEventCallback(widgetName, eventName, callback) {
          setTimeout(async () => {
              try {
                  const widget = WidgetUtils.getWidgetByName(widgetName);
                  const updatedOptions = {
                      chart: {
                          events: {
                              [eventName]: callback
                          }
                      }
                  };
                  await widget._chart.updateOptions(updatedOptions);
              }
              catch (e) {

              }
          }, 1000);
      }

      _generateConfig() {
          const config = {
              series: [],
              tooltip: {
                  enabledOnSeries: [0],
                  x: {
                      show: true,
                      format: 'dd/MM/yyyy HH:mm:ss',
                  },
                  y: {
                      formatter: function(value, { series, seriesIndex, dataPointIndex, w }) {
                          return value;
                      },
                  },
                  z: {
                      show: false,
                  }
              },
              chart: {
                  type: this._chartType,
                  events: {},
                  height: '100%',
                  toolbar: {
                      show: false,
                  }
              },
              xaxis: {
                  labels: {
                      style: {
                          fontSize: '14px',
                      }
                  },
                  tooltip: {
                      enabled: true,
                      formatter: function(value) {
                          return value;
                      }
                  }
              },
              yaxis: {
                  labels: {
                      style: {
                          fontSize: '14px',
                      }
                  },
                  tooltip: {
                      enabled: true,
                      formatter: function(value) {
                          return value;
                      }
                  }
              },
              zaxis: {
                  labels: {
                      style: {
                          fontSize: '14px',
                      }
                  },
                  tooltip: {
                      enabled: true
                  }
              },
              dataLabels: {
                  enabled: true,
                  style: {
                      fontSize: '14px',
                  }
              },
  	    labels: [],
              legend: {
                  show: true,
                  fontSize: '14px',
                  position: 'bottom',
                  onItemClick: {
                      toggleDataSeries: true,
                  },
              },
              plotOptions: {
                  bar: {
                      borderRadius: 4,
                      horizontal: true,
                  }
              },
              noData: {
                  text: 'No Data',
                  align: 'center',
                  verticalAlign: 'middle',
                  style: {
                      fontSize: '24px'
                  }
              }
          };

          // check if the additionalParams field contains an apex property,
          // then merge the two configurations giving priority to the custom one
          if (this._additionalParams && this._additionalParams.apex) {
              const mergedConfig = Object.assign(config, this._additionalParams.apex);
              return mergedConfig;
          }

          return config;
      }

      _buildTooltip(config, rsp) {
          /* By default the areaChart tooltip[y] is overwritten */
          config["tooltip"]["y"] = {
              formatter: function(value, { series, seriesIndex, dataPointIndex, w }) {
                  return value;
              }
          };

          /* Changing events if given */
          if (rsp['tooltip']) {
              for (const axis in rsp['tooltip']) {
                  if (axis === "x" || axis === "y" || axis === "z") {
                      const formatter = rsp['tooltip'][axis]['formatter'];
                      if(!config['tooltip'][axis])
                          config['tooltip'][axis] = {};

                      config['tooltip'][axis]['formatter'] = DEFINED_TOOLTIP[formatter] || NtopUtils[formatter];
                  }
              }

              /* Customizable tooltip requested */
              if(rsp['tooltip']['custom'])
                  config['tooltip']['custom'] = DEFINED_TOOLTIP[rsp['tooltip']['custom']] || NtopUtils[rsp['tooltip']['custom']];
          }
      }

      _buildAxisFormatter(config, axisName) {

          const axis = config[axisName];
          
          if (axis === undefined || axis.labels === undefined) return;
          
          // enable formatters
          if (axis.labels.ntop_utils_formatter !== undefined && axis.labels.ntop_utils_formatter !== 'none') {
              
              const selectedFormatter = axis.labels.ntop_utils_formatter;

              if (NtopUtils[selectedFormatter] === undefined) {
                  console.error(`xaxis: Formatting function '${selectedFormatter}' didn't found inside NtopUtils.`);
              }
              else {
                  axis.labels.formatter = NtopUtils[selectedFormatter];
              }
          }
      }

      _buildDataLabels(config, rsp) {
          if (rsp["dataLabels"]) {
              for (const [dataLabelsOpts, data] of Object.entries(rsp["dataLabels"])) {
                  config["dataLabels"][dataLabelsOpts] = data;
              }
          }   

          let formatter = config["dataLabels"]["formatter"];
          
          if(formatter && DEFINED_TOOLTIP[formatter]) {
              config["dataLabels"]["formatter"] = DEFINED_TOOLTIP[formatter];
          }
      }

      _buildConfig() {

          const config = this._generateConfig();
          const rsp = this._fetchedData.rsp;
          
          // add additional params fetched from the datasource
          const additionals = ['series', 'xaxis', 'yaxis', 'colors', 'labels', 'fill', 'filter', 'filtering_labels'];
          
          for (const additional of additionals) {

              if (rsp[additional] === undefined) continue;

              if (config[additional] !== undefined) {
                  config[additional] = Object.assign(config[additional], rsp[additional]);
              }
              else {
                  config[additional] = rsp[additional];
              }
          }
          
          /* Changing events if given */
          if (rsp['events']) {
              /* Just pass a table of events. e.g. { events = { click = "db_analyze", updated = "standard" } }*/
              for (const event in rsp['events']) {
                  config['chart']['events'][event] = DEFINED_EVENTS[rsp['events'][event]];
              }
          }

          if (rsp['horizontal_chart'] !== undefined) {
              config['plotOptions']['bar']['horizontal'] = rsp['horizontal_chart'];
          }

          this._buildTooltip(config, rsp);
          this._buildAxisFormatter(config, 'xaxis');
          this._buildAxisFormatter(config, 'yaxis');
          this._buildDataLabels(config, rsp);

          return config;
      }

      _initializeChart() {
          const config = this._buildConfig();
          this._chartConfig = config;
          this._chart = new ApexCharts(this._$htmlChart, this._chartConfig);
          this._chart.render();
      }

      async init() {
          await super.init();
          this._initializeChart();
      }

      async destroy() {
          await super.destroy();
          this._chart.destroy();
          this._chart = null;
      }

      async update(datasourceParams = {}) {
          if(this._chartConfig !== undefined) {	    
            if (datasourceParams) {
              await super.update(datasourceParams);
            } else {
              await super.updateByUrl();
            }
            
            if (this._chart != null) {
                  // expecting that rsp contains an object called series
                  const { colors, series, dataLabels, labels, xaxis, filtering_labels } = this._fetchedData.rsp;
                  // update the colors list
                  this._chartConfig.colors = colors;
                  this._chartConfig.series = series;
                  
                  if(xaxis && xaxis.categories)
                      this._chartConfig.xaxis.categories = xaxis.categories;
                  
                  if(filtering_labels)
                      this._chartConfig.filtering_labels = filtering_labels;

                  if(dataLabels) {
                      let formatter = this._chartConfig.dataLabels.formatter;
                      if(formatter && DEFINED_TOOLTIP[formatter])
                          this._chartConfig.dataLabels.formatter = DEFINED_TOOLTIP[formatter];
                      else
                          this._chartConfig.dataLabels.formatter = DEFAULT_FORMATTER;
                  }
                      
                  if(labels) 
                      this._chartConfig.labels = labels;

                  this._chart.updateOptions(this._chartConfig, true);
              }
          }
      }

      async destroyAndUpdate(datasource = {}) {
          await super.destroyAndUpdate(datasource);
          this._initializeChart();
      }

  }

  const fixSubMenuPosition = ($submenu, $hoverButton) => {

      const MIN_SPACE = 20;
      const MIN_HEIGHT = 150;

      let distFromAbove = $hoverButton.position().top;
      const submenuHeight = $submenu.height();
      const documentHeight = $(window).height();

      // if the submenu is too high to be shown then set
      // the overflow on y axis
      if (submenuHeight + distFromAbove >= documentHeight) {

          const currentSubmenuHeight = documentHeight - distFromAbove;
          if (currentSubmenuHeight <= MIN_HEIGHT) {
              distFromAbove = distFromAbove - submenuHeight + $hoverButton.outerHeight();
          }
          else {
              $submenu.css({'max-height': currentSubmenuHeight - MIN_SPACE, 'overflow-y': 'auto'});
          }

      }

      // set the submenu height
      $submenu.css('top', `${distFromAbove}px`);

  };

  $(window).on('scroll', function(){

      const UPPER_LIMIT = 32;
      $(`#n-navbar`).height();
      const windowScrollTop = $(this).scrollTop();

      if (windowScrollTop >= UPPER_LIMIT) {
          $(`#n-navbar`).addClass("scrolled bg-light");
      }
      else {
          $(`#n-navbar`).removeClass("scrolled bg-light");
      }

  });

  $(() => {

      const toggleSidebar = () => {
          // if the layer doesn't exists then create it
          if ($(`.sidebar-close-layer`).length == 0) {

              const $layer = $(`<div class='sidebar-close-layer' style='display:none'></div>`);
              // when the user clicks on the layer
              $layer.on('click', function(){
                  // remove active class from sidebar
                  $(`#n-sidebar`).removeClass('active');
                  // hide the layer and remove it from the DOM
                  $layer.fadeOut(function() {
                      $(this).remove();
                  });
              });

              // append the layer to the wrapper
              $(`#wrapper`).append($layer);
              // show the layer inside the page
              $layer.fadeIn();
          }
          else {
              // hide the existing layer and destroy it
              $(`.sidebar-close-layer`).fadeOut(function() {
                  $(this).remove();
              });
          }

          // show/hide the sidebar
          $(`#n-sidebar`).toggleClass('active');
      };

      $('#n-sidebar a.submenu').bind({
          mouseenter: function() {
              let submenu = $(this).parent().find(`div[id$='submenu']`);
              fixSubMenuPosition(submenu, $(this));
              submenu.show();
          },
          mouseleave: function() {
              let submenu = $(this).parent().find(`div[id$='submenu']`);
              submenu.hide();
          }
      });

      $(`div[id$='submenu']`).bind({
          mouseenter: function() {
              $(this).show();
          },
          mouseleave: function() {
              $(this).hide();
          }
      });

      /* toggle sidebar display */
      $(`button[data-bs-toggle='sidebar']`).on('click', function() {
          toggleSidebar();
      });
  });

  $(window).on('resize', function() {

      // re-calc submenu height
      const $currentSubmenu = $('#n-sidebar').find(`div.show[id$='submenu']`);

      if ($currentSubmenu.length > 0) {

          const $hoverButton = $currentSubmenu.parent().find(`a[data-bs-toggle='collapse']`);
          fixSubMenuPosition($currentSubmenu, $hoverButton);
      }

  });

  /**
      (C) 2022 - ntop.org
  */

  const ntopChartApex$1 = function() {
      // define default chartOptions for all chart type.
      const _default_BASE_ChartOptions = {
  	series: [],
  	chart: {
  	    height: "100%",
  	    width: "100%",
  	    toolbar: {
  		tools: {
  		    zoomout: false,
  		    download: false,
  		    zoomin: false,
  		    zoom: " ",
  		    selection: false,
  		    pan: false,
  		    reset: false
  		}
  	    },
  	    events: {}
  	},
  	yaxis: 
  	    {
  		labels: {
  		    show: true,
  		    style: {
  			colors: [],
  			fontSize: "11px",
  			fontWeight: 400,
  			cssClass: ""
  		    }
  		},
  		title: {
  		    rotate: -90,
  		    offsetY: 0,
  		    offsetX: 0,
  		    style: {
  			fontSize: "11px",
  			fontWeight: 900,
  			cssClass: ""
  		    }
  		},
  	    }
  	,
      	grid: {
      	    show: false
      	},
  	legend: {
  	    show: true
  	},
      };

      // define default xaxis formatter for chart with datetime on xaxis.
      const _setXTimeFormatter = function(chartOptions) {
  	chartOptions.xaxis.labels.formatter = function(value, { series, seriesIndex, dataPointIndex, w }) {
  	    return ntopng_utility$1.from_utc_to_server_date_format(value);
  	};
      };

      // define default chartOptions for area chart type.
      const _default_TS_STACKED_ChartOptions = function() {
  	let chartOptions = ntopng_utility$1.clone(_default_BASE_ChartOptions);
  	let TS_STACKED_ChartOptions = {
  	    chart: {
  		stacked: true,
  		type: "area",
  		zoom: {
  		    enabled: true,
  		    type: "x",
  		},
  	    },
  	    tooltip: {
  		x: {
  		    format: "dd MMM yyyy HH:mm:ss"
  		},
  		y: {}
  	    },
  	    xaxis: {
  		labels: {
  		    show: false,
  		    datetimeUTC: false,
  		    formatter: null,
  		},
  		axisTicks: {
  		    show: false
  		},
  		type: "datetime",
  		axisBorder: {
  		    show: true
  		},
  		convertedCatToNumeric: false
  	    },
      	    dataLabels: {
      		enabled: false
      	    },
      	    stroke: {
      		show: false,
      		curve: "smooth"
      	    },
      	    fill: {
      		type: "solid"
      	    },
  	};
  	ntopng_utility$1.copy_object_keys(TS_STACKED_ChartOptions, chartOptions, true);
  	return chartOptions;
      }();

      
      return {
  	typeChart: {
  	    TS_STACKED: "TS_STACKED",
  	    BASE: "BASE",
  	},
  	newChart: function(type) {	    
  	    let _chartOptions;
  	    let _chart;

  	    if (type == this.typeChart.TS_STACKED) {
  		_chartOptions = ntopng_utility$1.clone(_default_TS_STACKED_ChartOptions);
  		_setXTimeFormatter(_chartOptions);
  	    } else if (type == this.typeChart.BASE) {
  		_chartOptions = ntopng_utility$1.clone(_default_BASE_ChartOptions);
  	    } else {
  		throw `ntopChartApex::newChart: chart type = ${type} unsupported`;
  	    }
  	    
  	    return {
  		drawChart: function(htmlElement, chartOptions) {
  		    // add/replace chartOptions fields in _chartOptions
  		    ntopng_utility$1.copy_object_keys(chartOptions, _chartOptions, true);
  		    _chart = new ApexCharts(htmlElement, _chartOptions);
  		    _chart.render();
  		},
  		updateChart: function(chartOptions) {
  		    if (_chart == null) { return; }
  		    _chart.updateOptions(chartOptions, true);
  		},
  		registerEvent: function(eventName, callback, updateChart = false) {
  		    _chartOptions.chart.events[eventName] = callback;
  		    if (updateChart == true) {
  			_chart.updateOptions(_chartOptions);	    
  		    }
  		},
  	    };
  	},
      };
  }();

  /**
   * (C) 2020-21 - ntop.org
   * This file contains utilities used by the *new* datatables.
   */


  const DataTableHandlers = function() {
      let handlersIdDict = {};
      return {
  	addHandler: function(h) {
  	    let handlers = handlersIdDict[h.handlerId];
  	    if (handlers == null) {
  		handlers = [];
  		handlersIdDict[h.handlerId] = handlers;
  	    }
  	    handlers.push(() => {
  		h.onClick();
  	    });
  	    return `window['_DataTableButtonsOnClick']('${h.handlerId}', '${handlers.length - 1}')`;
  	},
  	getHandler: function(handlerId, rowId) {
  	    let handlers = handlersIdDict[handlerId];
  	    if (handlers == null) { return null; }
  	    return handlers[rowId];
  	},
  	deleteHandlersById: function(handlerId) {
  	    handlersIdDict[handlerId] = null;
  	},
      }
  }();

  window["_DataTableButtonsOnClick"] = function(handlerId, rowId) {
      let onClick = DataTableHandlers.getHandler(handlerId, rowId);
      if (onClick != null) {
  	onClick();
      }
  };

  class DataTableFiltersMenu {

      /**
       *
       * @param {options}
       */
      constructor({ tableAPI, filterMenuKey, filterTitle, filters, columnIndex, icon = null, extraAttributes = "", id = null, url = null, urlParams = null }) {
          this.rawFilters = filters;
          this.tableAPI = tableAPI;
          this.filterTitle = filterTitle;
          this.icon = icon;
          this.filterMenuKey = filterMenuKey;
          this.columnIndex = columnIndex;
          this.preventUpdate = false;
          this.currentFilterSelected = undefined;
          this.$datatableWrapper = $(tableAPI.context[0].nTableWrapper);
          this.extraAttributes = extraAttributes;
          this.id = id;
          this.url = url;
          this.urlParams;
        }

      get selectedFilter() {
          return this.currentFilterSelected;
      }

      init() {

          const self = this;

          // when the datatable has been initialized render the dropdown
          this.$datatableWrapper.on('init.dt', function () {
            self._render(self.rawFilters);
          });

          // on ajax reload then update the datatable entries
          this.tableAPI.on('draw', function () {
            self._update();
          });

          return self;
      }

      _countEntries(regex, data = []) {

          if (regex === undefined) {
              console.error("DataTableFiltersMenu::_countEntries() => the passed regex is undefined!");
          }

          const reg = new RegExp(regex);
          return data.filter(cellValue => reg.test(cellValue)).length;
      }

      _createMenuEntry(filter) {

          const self = this;
          let $entry = $(`<li class='dropdown-item pointer'>${filter.label} </li>`);
          
          if(self.url) {
            $entry = $(`<li class='dropdown-item pointer'><a href=# class='p-1 standard-color'>${filter.label} </li>`);

            if(filter.currently_active == true) {
              // set active filter title and key
              if (self.$dropdown.title.parent().find(`i.fas`).length == 0) {
                self.$dropdown.title.parent().prepend(`<i class='fas fa-filter'></i>`);
              }

              const newContent = $entry.html();
              self.$dropdown.title.html(newContent);
              // remove the active class from the li elements
              self.$dropdown.container.find('li').removeClass(`active`);
              // add active class to current entry
              $entry.addClass(`active`);
            }
          } else if (filter.regex !== undefined && (filter.countable === undefined || filter.countable)) {
              const data = this.tableAPI.columns(this.columnIndex).data()[0];
              const count = this._countEntries(filter.regex, data);
              const $counter = $(`<span class='counter'>(${count})</span>`);

              // if the count is 0 then hide the menu entry
              if (count == 0) $entry.hide();

              //append the $counter object inside the $entry
              $entry.append($counter);
          }

          $entry.on('click', function (e) {
            if(!self.url) {
              self.preventUpdate = true;

              // set active filter title and key
              if (self.$dropdown.title.parent().find(`i.fas`).length == 0) {
                  self.$dropdown.title.parent().prepend(`<i class='fas fa-filter'></i>`);
              }

              const newContent = $entry.html();
              self.$dropdown.title.html(newContent);
              // remove the active class from the li elements
              self.$dropdown.container.find('li').removeClass(`active`);
              // add active class to current entry
              $entry.addClass(`active`);
              // if the filter have a callback then call it
              if (filter.callback) filter.callback();
              // perform the table filtering
              self.tableAPI.column(self.columnIndex).search(filter.regex, true, false).draw();
              // set current filter
              self.currentFilterSelected = filter;
            } else {
              self.urlParams = window.location.search;
              const newUrlParams = new URLSearchParams(self.urlParams);
              newUrlParams.set(self.filterMenuKey, (typeof(filter.id) != undefined) ? filter.id : '');
              self.url + '?' + newUrlParams.toString();

              window.history.pushState('', '', window.location.pathname + '?' + newUrlParams.toString());
              location.reload();
            }
          });

          return $entry;
      }

      _createFilters(filters) {

          const filtersCreated = {};

          // for each filter defined in this.filters
          for (const filter of filters) {

              const $filter = this._createMenuEntry(filter);
              // save the filter inside the $filters object
              filtersCreated[filter.key] = { filter: filter, $node: $filter };
          }

          return filtersCreated;
      }

      _render(filters) {
        if(typeof this.columnIndex == 'undefined') {
          $(`<span id="${this.id}" ${this.extraAttributes} title="${this.filterTitle}">${this.icon || this.filterTitle}</span>`).insertBefore(this.$datatableWrapper.find('.dataTables_filter').parent());
        } else {
          const $dropdownContainer = $(`<div id='${this.filterMenuKey}-filters' class='dropdown d-inline'></div>`);
          const $dropdownButton = $(`<button class='btn-link btn dropdown-toggle' data-bs-toggle="dropdown" type='button'></button>`);
          const $dropdownTitle = $(`<span class='filter-title'>${this.filterTitle}</span>`);
          $dropdownButton.append($dropdownTitle);

          this.$dropdown = {
            container: $dropdownContainer,
            title: $dropdownTitle,
            button: $dropdownButton
          };

          this.filters = this._createFilters(filters);

          const $menuContainer = $(`<ul class='dropdown-menu dropdown-menu-lg-end scrollable-dropdown' id='${this.filterMenuKey}-filter-menu'></ul>`);
          for (const [_, filter] of Object.entries(this.filters)) {
              $menuContainer.append(filter.$node);
          }

          // the All entry is created by the object
          const allFilter = this._generateAllFilter();

          $menuContainer.prepend(this._createMenuEntry(allFilter));

          // append the created dropdown inside
          $dropdownContainer.append($dropdownButton);
          $dropdownContainer.append($menuContainer);
          // append the dropdown menu inside the filter wrapper
          $dropdownContainer.insertBefore(this.$datatableWrapper.find('.dataTables_filter').parent());

          this._selectFilterFromState(this.filterMenuKey);
        }
      }

      _selectFilterFromState(filterKey) {

          if (!this.tableAPI.state) return;
          if (!this.tableAPI.state.loaded()) return;
          if (!this.tableAPI.state.loaded().filters) return;

          // save the current table state
          tableAPI.state.save();
      }

      _generateAllFilter() {
          return {
              key: 'all',
              label: i18n_ext.all,
              regex: '',
              countable: false,
              callback: () => {
                  this.$dropdown.title.parent().find('i.fas.fa-filter').remove();
                  this.$dropdown.title.html(`${this.filterTitle}`);
              }
          };
      }

      _update() {

          // if the filters have not been initialized by _render then return
          if (this.filters === undefined) return;
          if (this.preventUpdate) {
              this.preventUpdate = false;
              return;
          }

          for (const [_, filter] of Object.entries(this.filters)) {
              if (filter.countable == false || filter.filter.countable == false) continue;

              const data = this.tableAPI.columns(this.columnIndex).data()[0];
              const count = this._countEntries(filter.filter.regex, data);

              // hide the filter if the count is zero
              (count == 0) ? filter.$node.hide() : filter.$node.show();
              // update the counter label
              filter.$node.find('.counter').text(`(${count})`);
              // update the selected button counter
              this.$dropdown.button.find('.counter').text(`(${count})`);
          }
      }

  }

  class DataTableUtils$1 {

      /**
       * Return a standard config for the Sprymedia (c) DataTables
       */
      static getStdDatatableConfig(dtButtons = [], dom = "<'row'<'col-sm-12 col-md-6'l><'col-sm-12 col-md-6 text-end'<'dt-search'f>B>rtip>") {

          // hide the buttons section if there aren't buttons inside the array
          if (dtButtons.length == 0) {
              dom = "fBrtip";
          }

          return {
              dom: dom,
              pagingType: 'full_numbers',
              lengthMenu: [[10, 25, 50, -1], [10, 25, 50, `${i18n.all}`]],
              language: {
                  search: i18n.script_search,
                  paginate: {
                      previous: '&lt;',
                      next: '&gt;',
                      first: '«',
                      last: '»'
                  }
              },
              saveState: true,
              responsive: true,
              buttons: {
                  buttons: dtButtons,
                  dom: {
                      button: {
                          className: 'btn btn-link'
                      },
                      container: {
                          className: 'd-inline-block'
                      }
                  }
              }
          }
      }


      /**
       * Example of action:
       * {
       *  class: string,
       *  data: object,
       *  icon: string,
       *  modal: string,
       *  href: string,
       *  hidden: bool,
       * }
       * @param {*} actions
       */
      static createActionButtons(actions = []) {

          const buttons = [];
          const dropdownButton = '<button type="button" class="btn btn-sm btn-secondary dropdown-toggle" data-bs-toggle="dropdown" aria-expanded="false"><i class="fas fa-align-justify"></i></button>';

          actions.forEach((action, i) => {
  	    let handler = "";
  	    if (action.handler) {
  		let fOnClick = DataTableHandlers.addHandler(action.handler);
  		handler = `onclick="${fOnClick}"`;
  	    }
              let button = (`
            <li>
                <a
                    ${(action.href || action.modal) ? `href='${action.href || action.modal}'` : ``}
                    ${handler}
                    ${(action.onclick) ? `onclick='${action.onclick}'` : ``}
                    ${action.modal ? "data-bs-toggle='modal'" : ``}
                    class='dropdown-item ${action.class ? action.class : ``}'
                    ${action.hidden ? "style='display: none'" : ``}
                    ${action.external ? "target='_about'" : ``}
                    >
                    <i class='fas ${action.icon}'></i> ${action.title || ''}
                </a>
            </li>
            `);
              buttons.push(button);
          });

          const list = `<ul class="dropdown-menu">${buttons.join('')}</ul>`;

          return (`<div class='dropdown'>${dropdownButton}${list}</div>`);
      }

      static deleteButtonHandlers(handlerId) {
  	DataTableHandlers.deleteHandlersById(handlerId);
      }

      static setAjaxConfig(config, url, dataSrc = '', method = "get", params = {}) {

          config.ajax = {
              url: url,
              type: method,
              dataSrc: dataSrc,
              data: function (d) {
                  return $.extend({}, d, params);
              }
          };

          return config;
      }

      static extendConfig(config, extension) {

          // if there are custom filters then manage state in this way
          if (extension.hasFilters) {

              extension.stateSaveCallback = function (settings, data) {
                  localStorage.setItem('DataTables_' + settings.sInstance, JSON.stringify(data));
              };

              extension.stateLoadCallback = function (settings) {
                  return JSON.parse(localStorage.getItem('DataTables_' + settings.sInstance));
              };

              // on saving the table state store the selected filters
              extension.stateSaveParams = function (settings, data) {

                  // save the filters selected from the user inside the state
                  $('[data-filter]').each(function () {

                      const activeFilter = $(this).find(`li.active`).data('filter-key');
                      if (!activeFilter) return;

                      // if the filters object is not allocated then initizializes it
                      if (!data.filters) data.filters = {};
                      data.filters[$(this).data('filter')] = activeFilter;

                  });
              };
          }

          // const userInitComplete = extension.initComplete;

          // const initComplete = (settings, json) => {
          //     if (userInitComplete !== undefined) userInitComplete(settings, json);
          //     // turn on tooltips
          //     $(`.actions-group [title]`).tooltip('enable');
          // };

          // // override initComplete function
          // extension.initComplete = initComplete;

          return $.extend({}, config, extension);
      }

      /**
       * Format the passed seconds into the "HH:MM:SS" string.
       * @param {number} seconds
       */
      static secondsToHHMMSS(seconds) {

          const padZeroes = n => `${n}`.padStart(2, '0');

          const sec = seconds % 60;
          const mins = Math.floor(seconds / 60) % 60;
          const hours = Math.floor(seconds / 3600);

          return `${padZeroes(hours)}:${padZeroes(mins)}:${padZeroes(sec)}`;
      }

      /**
      * Open the pool edit modal of a chosen pool if the query params contains the pool paramater
      * @param tableAPI
      */
      static openEditModalByQuery(params) {

          const urlParams = new URLSearchParams(window.location.search);
          if (!urlParams.has(params.paramName)) return;

          const dataID = urlParams.get(params.paramName);
          const data = params.datatableInstance.data().toArray().find((data => data[params.paramName] == dataID));

          // if the cancelIf param has been passed
          // then test the cancelIf function, if the return value
          // is true then cancel the modal opening
          if (typeof (params.cancelIf) === 'function') {
              if (params.cancelIf(data)) return;
          }

          const $modal = $(`#${params.modalHandler.getModalID()}`);

          // if the pool id is valid then open the edit modal
          if (data !== undefined) {
              params.modalHandler.invokeModalInit(data);
              $modal.modal('show');
          }

          if (!urlParams.has('referer')) {
              $modal.on('hidden.bs.modal', function (e) {

                  const url = new URL(window.location.href);
                  url.searchParams.delete(params.paramName);

                  history.replaceState({}, '', url.toString());
              });
              return;
          }
          const referer = urlParams.get('referer');

          $modal.on('hidden.bs.modal', function (e) {
              window.location = referer;
          });
      }

      static addToggleColumnsDropdown(tableAPI, toggleCallback = (col, visible) => {}) {

          if (tableAPI === undefined) {
              throw 'The $table is undefined!';
          }

          const tableID = tableAPI.table().node().id;

          DataTableUtils$1._loadColumnsVisibility(tableAPI).then(function (fetchedData) {

              let savedColumns = [-1];
              if (fetchedData.success) {
                  savedColumns = fetchedData.columns.map(i => parseInt(i));
              }
              else {
                  console.warn(fetchedData.message);
              }

              const columns = [];
              const ignoredColumns = [];
              const $datatableWrapper = $(tableAPI.context[0].nTableWrapper);

              // get the table headers 
              tableAPI.columns().every(function (i) {

                  // avoid already hidden columns
                  if (!tableAPI.column(i).visible()) {
                      ignoredColumns.push(i);
                      return;
                  }

                  columns.push({ index: i, name: this.header().textContent, label: this.i18n.name /* Human-readable column name */ });
              });

              const $btnGroup = $(`
                <div class="btn-group">
                    <button type="button" class="btn btn-link dropdown-toggle" data-bs-toggle="dropdown" aria-haspopup="true" aria-expanded="false">
                        <i class="fas fa-eye"></i>
                    </button>
                </div>
            `);

              const $dropdownMenu = $(`<div class="dropdown-menu dropdown-menu-right" style='width: max-content;'><h6 class="dropdown-header">Show Columns</h6></div>`);
              const $checkboxes = $(`<div class='px-4'></div>`);

              for (let i = 0; i < columns.length; i++) {
                  const column = columns[i];

  		// Prevents columns with no names to be selectively hidden (e.g., the entity under the all alerts page)
  		if(column.name == "")
  		    continue;

                  // create a checkbox and delegate a change event
                  const id = `toggle-${column.name.split().join('_')}`; 

                  // check if the column id it's inside the savedColumns array
                  // if toggled is true then the column is not hidden
                  const toggled = savedColumns.indexOf(column.index) === -1;
                  if (!toggled) {
                      const col = tableAPI.column(column.index);
                      col.visible(false);
                  }

                  const $checkbox = $(`<input class="form-check-input" ${(toggled ? 'checked' : '')} type="checkbox" id="${id}">`);
                  const $wrapper = $(`
                    <div class="form-check form-switch">
                        <label class="form-check-label" for="${id}">
                            ${column.name}
                        </label>
                    </div>
                `);

                  $checkbox.on('change', function (e) {
                      $(`.overlay`).toggle(500);
                      
                      // Get the column API object
                      const col = tableAPI.column(column.index);
                      // Toggle the visibility
                      col.visible(!col.visible());

                      const visible = col.visible();

                      const hiddenColumns = [];
                      // insert inside the array only the hidden columns
                      tableAPI.columns().every(function(i) {
                          if (tableAPI.column(i).visible() || ignoredColumns.indexOf(i) !== -1) return;
                          hiddenColumns.push(i); 
                      });

                      // save the table view inside redis
                      $.post(`${http_prefix}/lua/datatable_columns.lua`, {
                          action: 'save', table: tableID, columns: hiddenColumns.join(','), csrf: window.__CSRF_DATATABLE__
                      }).then(function(data) {
                          if (data.success) return;
                          console.warn(data.message);
                      });

                      if (toggleCallback !== undefined) {
                          toggleCallback(col, visible);
                      }

                  });

                  $wrapper.prepend($checkbox);
                  $checkboxes.append($wrapper);
              }

              $dropdownMenu.on("click.bs.dropdown", function (e) { e.stopPropagation(); });

              // append the new node inside the datatable
              $btnGroup.append($dropdownMenu.append($checkboxes));
              $datatableWrapper.find('.dt-search').parent().append($btnGroup);
          });
      }

      static async _loadColumnsVisibility(tableAPI) {
          const tableID = tableAPI.table().node().id;
          return $.get(`${http_prefix}/lua/datatable_columns.lua?table=${tableID}&action=load`);
      }

  }

  class DataTableRenders {

      static alertSeverityAndType(severity, type, alert) {
          return `${DataTableRenders.formatValueLabel(severity, type, alert)} ${DataTableRenders.formatValueLabel(alert.alert_id, type, alert)}`;
      }

      static hideIfZero(obj, type, row) {
          let color = (obj.color !== undefined ? obj.color : "#aaa");
          let value = (obj.value !== undefined ? obj.value : obj);
          if (type === "display" && parseInt(value) === 0) color = "#aaa";
          let span = `<span style='color: ${color}'>${NtopUtils.fint(value)}</span>`;
          if (obj.url !== undefined) span = `<a href="${obj.url}">${span}</a>`;
          return span;
      }

      static secondsToTime(seconds, type, row) {
          if (type === "display") return NtopUtils.secondsToTime(seconds);
          return seconds;
      }

      static filterize(key, value, label, tag_label, title, html) {
          return `<a class='tag-filter' data-tag-key='${key}' title='${title || value}' data-tag-value='${value}' data-tag-label='${tag_label || label || value}' href='#'>${html || label || value}</a>`;
      }

      static formatValueLabel(obj, type, row) {
          if (type !== "display") return obj.value;
          let cell = obj.label;
          if (obj.color) cell = `<span class='font-weight-bold' style='color: ${obj.color}'>${cell}</span>`;
          return cell;
      }

      static formatMessage(obj, type, row) {
          if (type !== "display") return obj.value;
             
          let cell = obj.descr;
          if (obj.shorten_descr)
              cell = `<span title="${obj.descr}">${obj.shorten_descr}</span>`;

          return cell;
      }

      static formatSubtype(obj, type, row) {
          if (type !== "display") return obj;

          let label = DataTableRenders.filterize('subtype', obj, obj);

          return label; 
      }

      static formatSNMPInterface(obj, type, row) {
          if (type !== "display") return obj.value;
          let cell = DataTableRenders.filterize('snmp_interface', obj.value, obj.label, obj.label, obj.label);
          if (obj.color) cell = `<span class='font-weight-bold' style='color: ${obj.color}'>${cell}</span>`;
          return cell;
      }

      static formatSNMPIP(obj, type, row) {
          if (type !== "display") return obj;
          return DataTableRenders.filterize('ip', obj, obj, obj, obj);
      }

      static getFormatGenericField(field) {
  	return function(obj, type, row) {
              if (type !== "display") return obj.value;
      	    let html_ref = '';
  	    if (obj.reference !== undefined)
  		html_ref = obj.reference;
              let label = DataTableRenders.filterize(field, row[field].value, row[field].label, row[field].label, row[field].label);
              return label + ' ' + html_ref;
  	}
      }
      
      static formatHost(obj, type, row) {
          if (type !== "display") return obj;
      	let html_ref = '';
  	if (obj.reference !== undefined)
  	   html_ref = obj.reference;
  	let label = "";

  	let hostKey, hostValue;
          if (obj.label && obj.label != obj.value) {
  	    hostKey = "name";
  	    hostValue = obj.label_long;
              label = DataTableRenders.filterize('name', obj.label_long, obj.label, obj.label, obj.label_long);
  	}
          else {
  	    hostKey = "ip";
  	    hostValue = obj.value;
              label = DataTableRenders.filterize('ip', obj.value, obj.label, obj.label, obj.label_long);
  	}

          if (row.vlan_id && row.vlan_id != "") {
              label = DataTableRenders.filterize(hostKey, `${hostValue}@${row.vlan_id}`, `${obj.label}@${row.vlan_id}`, `${obj.label}@${row.vlan_id}`, `${obj.label_long}@${row.vlan_id}`);
  	}

          if (obj.country)
              label = label + DataTableRenders.filterize('country', obj.country, obj.country, obj.country, obj.country, ' <img src="' + http_prefix + '/dist/images/blank.gif" class="flag flag-' + obj.country.toLowerCase() + '"></a> ');

          if (row.role && row.role.value == 'attacker')
            label = label + ' ' + DataTableRenders.filterize('role', row.role.value, 
              '<i class="fas fa-skull" title="'+row.role.label+'"></i>', row.role.label);
          else if (row.role && row.role.value == 'victim')
            label = label + ' ' + DataTableRenders.filterize('role', row.role.value,
              '<i class="fas fa-sad-tear" title="'+row.role.label+'"></i>', row.role.label);

          if (row.role_cli_srv && row.role_cli_srv.value == 'client')
            label = label + ' ' + DataTableRenders.filterize('role_cli_srv', row.role_cli_srv.value, 
              '<i class="fas fa-long-arrow-alt-right" title="'+row.role_cli_srv.label+'"></i>', row.role_cli_srv.label);
          else if (row.role_cli_srv && row.role_cli_srv.value == 'server')
            label = label + ' ' + DataTableRenders.filterize('role_cli_srv', row.role_cli_srv.value,
              '<i class="fas fa-long-arrow-alt-left" title="'+row.role_cli_srv.label+'"></i>', row.role_cli_srv.label);

          return label + ' ' + html_ref; 
      }

      static filterizeVlan(flow, row, key, value, label, title) {
  	let valueVlan = value;
  	let labelVlan = label;
  	let titleVlan = title;
  	if (flow.vlan && flow.vlan.value != 0) {
  	    valueVlan = `${value}@${flow.vlan.value}`;
  	    labelVlan = `${label}@${flow.vlan.label}`;
  	    titleVlan = `${title}@${flow.vlan.title}`;
  	}
          return DataTableRenders.filterize(key, valueVlan, labelVlan, labelVlan, titleVlan); 
      }

      static formatFlowTuple(flow, type, row) {
          let active_ref = (flow.active_url ? `<a href="${flow.active_url}"><i class="fas fa-stream"></i></a>` : "");

          let cliLabel = "";
          if (flow.cli_ip.name) {
            let title = "";
              if(flow.cli_ip.label_long) title = flow.cli_ip.value + " [" + flow.cli_ip.label_long + "]";
              cliLabel = DataTableRenders.filterizeVlan(flow, row, 'cli_name', flow.cli_ip.name, flow.cli_ip.label, title); 
          } else
              cliLabel = DataTableRenders.filterizeVlan(flow, row, 'cli_ip', flow.cli_ip.value, flow.cli_ip.label, flow.cli_ip.label_long); 

          let cliFlagLabel= '';

          if (flow.cli_ip.country && flow.cli_ip.country !== "nil")
              cliFlagLabel = DataTableRenders.filterize('cli_country', flow.cli_ip.country, flow.cli_ip.country, flow.cli_ip.country, flow.cli_ip.country, ' <img src="' + http_prefix + '/dist/images/blank.gif" class="flag flag-' + flow.cli_ip.country.toLowerCase() + '"></a> ');

          let cliPortLabel = ((flow.cli_port && flow.cli_port > 0) ? ":"+DataTableRenders.filterize('cli_port', flow.cli_port, flow.cli_port) : "");

          let cliBlacklisted ='';
          if(flow.cli_ip.blacklisted == true) 
            cliBlacklisted = " <i class=\'fas fa-ban fa-sm\' title=\'" + i18n("hosts_stats.blacklisted") + "\'></i>";

          let srvLabel = "";
          if (flow.srv_ip.name) {
            let title = "";
            if(flow.srv_ip.label_long) title = flow.srv_ip.value + " [" + flow.srv_ip.label_long + "]";
              srvLabel = DataTableRenders.filterizeVlan(flow, row, 'srv_name', flow.srv_ip.name, flow.srv_ip.label, title);
          } else
              srvLabel = DataTableRenders.filterizeVlan(flow, row, 'srv_ip', flow.srv_ip.value, flow.srv_ip.label, flow.srv_ip.label_long);
          let srvPortLabel = ((flow.cli_port && flow.cli_port > 0) ? ":"+DataTableRenders.filterize('srv_port', flow.srv_port, flow.srv_port) : "");

          let srvFlagLabel= '';

          if (flow.srv_ip.country && flow.srv_ip.country !== "nil")
              srvFlagLabel = DataTableRenders.filterize('srv_country', flow.srv_ip.country, flow.srv_ip.country, flow.srv_ip.country, flow.srv_ip.country, ' <img src="' + http_prefix + '/dist/images/blank.gif" class="flag flag-' + flow.srv_ip.country.toLowerCase() + '"></a> ');

          let srvBlacklisted ='';
          if(flow.srv_ip.blacklisted == true) 
            srvBlacklisted = " <i class=\'fas fa-ban fa-sm\' title=\'" + i18n("hosts_stats.blacklisted") + "\'></i>";
      
          let cliIcons = "";
          let srvIcons = "";
          if (row.cli_role) {
              if (row.cli_role.value == 'attacker')
                  cliIcons += DataTableRenders.filterize('role', 'attacker', '<i class="fas fa-skull" title="'+row.cli_role.label+'"></i>', row.cli_role.tag_label);
              else if (row.cli_role.value == 'victim')
                  cliIcons += DataTableRenders.filterize('role', 'victim',  '<i class="fas fa-sad-tear" title="'+row.cli_role.label+'"></i>', row.cli_role.tag_label);
          }

          if (row.srv_role) {
              if (row.srv_role.value == 'attacker')
                  srvIcons += DataTableRenders.filterize('role', 'attacker', '<i class="fas fa-skull" title="'+row.srv_role.label+'"></i>', row.srv_role.tag_label);
              else if (row.srv_role.value == 'victim')
                  srvIcons += DataTableRenders.filterize('role', 'victim',  '<i class="fas fa-sad-tear" title="'+row.srv_role.label+'"></i>', row.srv_role.tag_label);
          }

          return `${active_ref} ${cliLabel}${cliBlacklisted}${cliFlagLabel}${cliPortLabel} ${cliIcons} ${flow.cli_ip.reference} <i class="fas fa-exchange-alt fa-lg" aria-hidden="true"></i> ${srvLabel}${srvBlacklisted}${srvFlagLabel}${srvPortLabel} ${srvIcons} ${flow.srv_ip.reference}`;
      }

      static formatNameDescription(obj, type, row) {
          if (type !== "display") return obj.name;
          let msg = DataTableRenders.filterize('alert_id', obj.value, obj.name, obj.fullname, obj.fullname);

  	/* DECIDED NOT TO SHOW SHORTENED DESCRIPTIONS IN THE ALERT COLUMNS
          if(obj.description) {
             const strip_tags = function(html) { let t = document.createElement("div"); t.innerHTML = html; return t.textContent || t.innerText || ""; }
             let desc = strip_tags(obj.description);
             if(desc.startsWith(obj.name)) desc = desc.replace(obj.name, "");
             let name_len = strip_tags(obj.name).length;
             let desc_len = desc.length;
             let total_len = name_len + desc_len;
             let tooltip = ""

             let limit = 30; // description limit
             if (row.family != 'flow') {
               limit = 50; // some families have room for bigger descriptions
             }

             if (total_len > limit) { // cut and set a tooltip
               if (name_len >= limit) {
                 desc = ""; // name is already too long, no description
               } else { // cut the description
                 desc = desc.substr(0, limit - obj.name.length);
                 desc = desc.replace(/\s([^\s]*)$/, ''); // word break
                 desc = desc + '&hellip;'; // add '...'
               }
               tooltip = strip_tags(obj.description);
             }

             msg = msg + ': <span title="' + tooltip + '">' + desc + '</span>';
          }
  	*/

          return msg;
      }

      static applyCellStyle(cell, cellData, rowData, rowIndex, colIndex) {
        if (cellData.highlight) {
           $(cell).css("border-left", "5px solid "+cellData.highlight);
        }
     }
  }

  window.do_pie = do_pie;

  window.DataTableUtils = DataTableUtils$1;
  window.DataTableFiltersMenu = DataTableFiltersMenu;
  window.DataTableRenders = DataTableRenders;

  window.ChartWidget = ChartWidget;
  window.WidgetUtils = WidgetUtils;
  window.ntopChartApex = ntopChartApex$1;

  /* Handle Blog Notifications */
  $(function () {

    function blogNotifcationClick(e) {

      if (e.type == "mousedown" && (e.metaKey || e.ctrlKey || e.which !== 2)) return;

      const id = $(this).data('id');

      $.post(`${http_prefix}/lua/update_blog_posts.lua`, {
        blog_notification_id: id,
        csrf: window.__BLOG_NOTIFICATION_CSRF__
      },
        (data) => {

          if (data.success) {

            $(this).off('click').off('mousedown').attr('data-read', 'true').data('read', 'true').find('.badge').remove();
            
            const count = $(`.blog-notification[data-read='false']`).length;

            if (count == 0) {
              $('.notification-bell').remove();
            }
            else {
              $('.notification-bell').html(count);
            }
          }
        });
    }

    // on the notifications not yet read delegate the click event
    $(`.blog-notification[data-read='false']`).on('click', blogNotifcationClick).on('mousedown', blogNotifcationClick);
  });

  /**
   * Make a map and return a function for checking if a key
   * is in that map.
   * IMPORTANT: all calls of this function must be prefixed with
   * \/\*#\_\_PURE\_\_\*\/
   * So that rollup can tree-shake them if necessary.
   */
  function makeMap(str, expectsLowerCase) {
      const map = Object.create(null);
      const list = str.split(',');
      for (let i = 0; i < list.length; i++) {
          map[list[i]] = true;
      }
      return expectsLowerCase ? val => !!map[val.toLowerCase()] : val => !!map[val];
  }

  /**
   * dev only flag -> name mapping
   */
  const PatchFlagNames = {
      [1 /* TEXT */]: `TEXT`,
      [2 /* CLASS */]: `CLASS`,
      [4 /* STYLE */]: `STYLE`,
      [8 /* PROPS */]: `PROPS`,
      [16 /* FULL_PROPS */]: `FULL_PROPS`,
      [32 /* HYDRATE_EVENTS */]: `HYDRATE_EVENTS`,
      [64 /* STABLE_FRAGMENT */]: `STABLE_FRAGMENT`,
      [128 /* KEYED_FRAGMENT */]: `KEYED_FRAGMENT`,
      [256 /* UNKEYED_FRAGMENT */]: `UNKEYED_FRAGMENT`,
      [512 /* NEED_PATCH */]: `NEED_PATCH`,
      [1024 /* DYNAMIC_SLOTS */]: `DYNAMIC_SLOTS`,
      [2048 /* DEV_ROOT_FRAGMENT */]: `DEV_ROOT_FRAGMENT`,
      [-1 /* HOISTED */]: `HOISTED`,
      [-2 /* BAIL */]: `BAIL`
  };

  /**
   * Dev only
   */
  const slotFlagsText = {
      [1 /* STABLE */]: 'STABLE',
      [2 /* DYNAMIC */]: 'DYNAMIC',
      [3 /* FORWARDED */]: 'FORWARDED'
  };

  const GLOBALS_WHITE_LISTED = 'Infinity,undefined,NaN,isFinite,isNaN,parseFloat,parseInt,decodeURI,' +
      'decodeURIComponent,encodeURI,encodeURIComponent,Math,Number,Date,Array,' +
      'Object,Boolean,String,RegExp,Map,Set,JSON,Intl,BigInt';
  const isGloballyWhitelisted = /*#__PURE__*/ makeMap(GLOBALS_WHITE_LISTED);

  const range = 2;
  function generateCodeFrame(source, start = 0, end = source.length) {
      const lines = source.split(/\r?\n/);
      let count = 0;
      const res = [];
      for (let i = 0; i < lines.length; i++) {
          count += lines[i].length + 1;
          if (count >= start) {
              for (let j = i - range; j <= i + range || end > count; j++) {
                  if (j < 0 || j >= lines.length)
                      continue;
                  const line = j + 1;
                  res.push(`${line}${' '.repeat(Math.max(3 - String(line).length, 0))}|  ${lines[j]}`);
                  const lineLength = lines[j].length;
                  if (j === i) {
                      // push underline
                      const pad = start - (count - lineLength) + 1;
                      const length = Math.max(1, end > count ? lineLength - pad : end - start);
                      res.push(`   |  ` + ' '.repeat(pad) + '^'.repeat(length));
                  }
                  else if (j > i) {
                      if (end > count) {
                          const length = Math.max(Math.min(end - count, lineLength), 1);
                          res.push(`   |  ` + '^'.repeat(length));
                      }
                      count += lineLength + 1;
                  }
              }
              break;
          }
      }
      return res.join('\n');
  }

  /**
   * On the client we only need to offer special cases for boolean attributes that
   * have different names from their corresponding dom properties:
   * - itemscope -> N/A
   * - allowfullscreen -> allowFullscreen
   * - formnovalidate -> formNoValidate
   * - ismap -> isMap
   * - nomodule -> noModule
   * - novalidate -> noValidate
   * - readonly -> readOnly
   */
  const specialBooleanAttrs = `itemscope,allowfullscreen,formnovalidate,ismap,nomodule,novalidate,readonly`;
  const isSpecialBooleanAttr = /*#__PURE__*/ makeMap(specialBooleanAttrs);

  function normalizeStyle(value) {
      if (isArray(value)) {
          const res = {};
          for (let i = 0; i < value.length; i++) {
              const item = value[i];
              const normalized = normalizeStyle(isString(item) ? parseStringStyle(item) : item);
              if (normalized) {
                  for (const key in normalized) {
                      res[key] = normalized[key];
                  }
              }
          }
          return res;
      }
      else if (isObject(value)) {
          return value;
      }
  }
  const listDelimiterRE = /;(?![^(]*\))/g;
  const propertyDelimiterRE = /:(.+)/;
  function parseStringStyle(cssText) {
      const ret = {};
      cssText.split(listDelimiterRE).forEach(item => {
          if (item) {
              const tmp = item.split(propertyDelimiterRE);
              tmp.length > 1 && (ret[tmp[0].trim()] = tmp[1].trim());
          }
      });
      return ret;
  }
  function normalizeClass(value) {
      let res = '';
      if (isString(value)) {
          res = value;
      }
      else if (isArray(value)) {
          for (let i = 0; i < value.length; i++) {
              const normalized = normalizeClass(value[i]);
              if (normalized) {
                  res += normalized + ' ';
              }
          }
      }
      else if (isObject(value)) {
          for (const name in value) {
              if (value[name]) {
                  res += name + ' ';
              }
          }
      }
      return res.trim();
  }

  // These tag configs are shared between compiler-dom and runtime-dom, so they
  // https://developer.mozilla.org/en-US/docs/Web/HTML/Element
  const HTML_TAGS = 'html,body,base,head,link,meta,style,title,address,article,aside,footer,' +
      'header,h1,h2,h3,h4,h5,h6,hgroup,nav,section,div,dd,dl,dt,figcaption,' +
      'figure,picture,hr,img,li,main,ol,p,pre,ul,a,b,abbr,bdi,bdo,br,cite,code,' +
      'data,dfn,em,i,kbd,mark,q,rp,rt,rtc,ruby,s,samp,small,span,strong,sub,sup,' +
      'time,u,var,wbr,area,audio,map,track,video,embed,object,param,source,' +
      'canvas,script,noscript,del,ins,caption,col,colgroup,table,thead,tbody,td,' +
      'th,tr,button,datalist,fieldset,form,input,label,legend,meter,optgroup,' +
      'option,output,progress,select,textarea,details,dialog,menu,' +
      'summary,template,blockquote,iframe,tfoot';
  // https://developer.mozilla.org/en-US/docs/Web/SVG/Element
  const SVG_TAGS = 'svg,animate,animateMotion,animateTransform,circle,clipPath,color-profile,' +
      'defs,desc,discard,ellipse,feBlend,feColorMatrix,feComponentTransfer,' +
      'feComposite,feConvolveMatrix,feDiffuseLighting,feDisplacementMap,' +
      'feDistanceLight,feDropShadow,feFlood,feFuncA,feFuncB,feFuncG,feFuncR,' +
      'feGaussianBlur,feImage,feMerge,feMergeNode,feMorphology,feOffset,' +
      'fePointLight,feSpecularLighting,feSpotLight,feTile,feTurbulence,filter,' +
      'foreignObject,g,hatch,hatchpath,image,line,linearGradient,marker,mask,' +
      'mesh,meshgradient,meshpatch,meshrow,metadata,mpath,path,pattern,' +
      'polygon,polyline,radialGradient,rect,set,solidcolor,stop,switch,symbol,' +
      'text,textPath,title,tspan,unknown,use,view';
  const VOID_TAGS = 'area,base,br,col,embed,hr,img,input,link,meta,param,source,track,wbr';
  const isHTMLTag = /*#__PURE__*/ makeMap(HTML_TAGS);
  const isSVGTag = /*#__PURE__*/ makeMap(SVG_TAGS);
  const isVoidTag = /*#__PURE__*/ makeMap(VOID_TAGS);

  function looseCompareArrays(a, b) {
      if (a.length !== b.length)
          return false;
      let equal = true;
      for (let i = 0; equal && i < a.length; i++) {
          equal = looseEqual(a[i], b[i]);
      }
      return equal;
  }
  function looseEqual(a, b) {
      if (a === b)
          return true;
      let aValidType = isDate(a);
      let bValidType = isDate(b);
      if (aValidType || bValidType) {
          return aValidType && bValidType ? a.getTime() === b.getTime() : false;
      }
      aValidType = isArray(a);
      bValidType = isArray(b);
      if (aValidType || bValidType) {
          return aValidType && bValidType ? looseCompareArrays(a, b) : false;
      }
      aValidType = isObject(a);
      bValidType = isObject(b);
      if (aValidType || bValidType) {
          /* istanbul ignore if: this if will probably never be called */
          if (!aValidType || !bValidType) {
              return false;
          }
          const aKeysCount = Object.keys(a).length;
          const bKeysCount = Object.keys(b).length;
          if (aKeysCount !== bKeysCount) {
              return false;
          }
          for (const key in a) {
              const aHasKey = a.hasOwnProperty(key);
              const bHasKey = b.hasOwnProperty(key);
              if ((aHasKey && !bHasKey) ||
                  (!aHasKey && bHasKey) ||
                  !looseEqual(a[key], b[key])) {
                  return false;
              }
          }
      }
      return String(a) === String(b);
  }
  function looseIndexOf(arr, val) {
      return arr.findIndex(item => looseEqual(item, val));
  }

  /**
   * For converting {{ interpolation }} values to displayed strings.
   * @private
   */
  const toDisplayString = (val) => {
      return val == null
          ? ''
          : isObject(val)
              ? JSON.stringify(val, replacer, 2)
              : String(val);
  };
  const replacer = (_key, val) => {
      if (isMap(val)) {
          return {
              [`Map(${val.size})`]: [...val.entries()].reduce((entries, [key, val]) => {
                  entries[`${key} =>`] = val;
                  return entries;
              }, {})
          };
      }
      else if (isSet(val)) {
          return {
              [`Set(${val.size})`]: [...val.values()]
          };
      }
      else if (isObject(val) && !isArray(val) && !isPlainObject(val)) {
          return String(val);
      }
      return val;
  };

  const EMPTY_OBJ = Object.freeze({})
      ;
  const EMPTY_ARR = Object.freeze([]) ;
  const NOOP = () => { };
  /**
   * Always return false.
   */
  const NO = () => false;
  const onRE = /^on[^a-z]/;
  const isOn = (key) => onRE.test(key);
  const isModelListener = (key) => key.startsWith('onUpdate:');
  const extend = Object.assign;
  const remove = (arr, el) => {
      const i = arr.indexOf(el);
      if (i > -1) {
          arr.splice(i, 1);
      }
  };
  const hasOwnProperty = Object.prototype.hasOwnProperty;
  const hasOwn = (val, key) => hasOwnProperty.call(val, key);
  const isArray = Array.isArray;
  const isMap = (val) => toTypeString(val) === '[object Map]';
  const isSet = (val) => toTypeString(val) === '[object Set]';
  const isDate = (val) => val instanceof Date;
  const isFunction = (val) => typeof val === 'function';
  const isString = (val) => typeof val === 'string';
  const isSymbol = (val) => typeof val === 'symbol';
  const isObject = (val) => val !== null && typeof val === 'object';
  const isPromise = (val) => {
      return isObject(val) && isFunction(val.then) && isFunction(val.catch);
  };
  const objectToString = Object.prototype.toString;
  const toTypeString = (value) => objectToString.call(value);
  const toRawType = (value) => {
      // extract "RawType" from strings like "[object RawType]"
      return toTypeString(value).slice(8, -1);
  };
  const isPlainObject = (val) => toTypeString(val) === '[object Object]';
  const isIntegerKey = (key) => isString(key) &&
      key !== 'NaN' &&
      key[0] !== '-' &&
      '' + parseInt(key, 10) === key;
  const isReservedProp = /*#__PURE__*/ makeMap(
  // the leading comma is intentional so empty string "" is also included
  ',key,ref,' +
      'onVnodeBeforeMount,onVnodeMounted,' +
      'onVnodeBeforeUpdate,onVnodeUpdated,' +
      'onVnodeBeforeUnmount,onVnodeUnmounted');
  const cacheStringFunction = (fn) => {
      const cache = Object.create(null);
      return ((str) => {
          const hit = cache[str];
          return hit || (cache[str] = fn(str));
      });
  };
  const camelizeRE = /-(\w)/g;
  /**
   * @private
   */
  const camelize = cacheStringFunction((str) => {
      return str.replace(camelizeRE, (_, c) => (c ? c.toUpperCase() : ''));
  });
  const hyphenateRE = /\B([A-Z])/g;
  /**
   * @private
   */
  const hyphenate = cacheStringFunction((str) => str.replace(hyphenateRE, '-$1').toLowerCase());
  /**
   * @private
   */
  const capitalize = cacheStringFunction((str) => str.charAt(0).toUpperCase() + str.slice(1));
  /**
   * @private
   */
  const toHandlerKey = cacheStringFunction((str) => (str ? `on${capitalize(str)}` : ``));
  // compare whether a value has changed, accounting for NaN.
  const hasChanged = (value, oldValue) => value !== oldValue && (value === value || oldValue === oldValue);
  const invokeArrayFns = (fns, arg) => {
      for (let i = 0; i < fns.length; i++) {
          fns[i](arg);
      }
  };
  const def = (obj, key, value) => {
      Object.defineProperty(obj, key, {
          configurable: true,
          enumerable: false,
          value
      });
  };
  const toNumber = (val) => {
      const n = parseFloat(val);
      return isNaN(n) ? val : n;
  };
  let _globalThis;
  const getGlobalThis = () => {
      return (_globalThis ||
          (_globalThis =
              typeof globalThis !== 'undefined'
                  ? globalThis
                  : typeof self !== 'undefined'
                      ? self
                      : typeof window !== 'undefined'
                          ? window
                          : typeof global !== 'undefined'
                              ? global
                              : {}));
  };

  const targetMap = new WeakMap();
  const effectStack = [];
  let activeEffect;
  const ITERATE_KEY = Symbol('iterate' );
  const MAP_KEY_ITERATE_KEY = Symbol('Map key iterate' );
  function isEffect(fn) {
      return fn && fn._isEffect === true;
  }
  function effect(fn, options = EMPTY_OBJ) {
      if (isEffect(fn)) {
          fn = fn.raw;
      }
      const effect = createReactiveEffect(fn, options);
      if (!options.lazy) {
          effect();
      }
      return effect;
  }
  function stop(effect) {
      if (effect.active) {
          cleanup(effect);
          if (effect.options.onStop) {
              effect.options.onStop();
          }
          effect.active = false;
      }
  }
  let uid = 0;
  function createReactiveEffect(fn, options) {
      const effect = function reactiveEffect() {
          if (!effect.active) {
              return options.scheduler ? undefined : fn();
          }
          if (!effectStack.includes(effect)) {
              cleanup(effect);
              try {
                  enableTracking();
                  effectStack.push(effect);
                  activeEffect = effect;
                  return fn();
              }
              finally {
                  effectStack.pop();
                  resetTracking();
                  activeEffect = effectStack[effectStack.length - 1];
              }
          }
      };
      effect.id = uid++;
      effect.allowRecurse = !!options.allowRecurse;
      effect._isEffect = true;
      effect.active = true;
      effect.raw = fn;
      effect.deps = [];
      effect.options = options;
      return effect;
  }
  function cleanup(effect) {
      const { deps } = effect;
      if (deps.length) {
          for (let i = 0; i < deps.length; i++) {
              deps[i].delete(effect);
          }
          deps.length = 0;
      }
  }
  let shouldTrack = true;
  const trackStack = [];
  function pauseTracking() {
      trackStack.push(shouldTrack);
      shouldTrack = false;
  }
  function enableTracking() {
      trackStack.push(shouldTrack);
      shouldTrack = true;
  }
  function resetTracking() {
      const last = trackStack.pop();
      shouldTrack = last === undefined ? true : last;
  }
  function track(target, type, key) {
      if (!shouldTrack || activeEffect === undefined) {
          return;
      }
      let depsMap = targetMap.get(target);
      if (!depsMap) {
          targetMap.set(target, (depsMap = new Map()));
      }
      let dep = depsMap.get(key);
      if (!dep) {
          depsMap.set(key, (dep = new Set()));
      }
      if (!dep.has(activeEffect)) {
          dep.add(activeEffect);
          activeEffect.deps.push(dep);
          if (activeEffect.options.onTrack) {
              activeEffect.options.onTrack({
                  effect: activeEffect,
                  target,
                  type,
                  key
              });
          }
      }
  }
  function trigger(target, type, key, newValue, oldValue, oldTarget) {
      const depsMap = targetMap.get(target);
      if (!depsMap) {
          // never been tracked
          return;
      }
      const effects = new Set();
      const add = (effectsToAdd) => {
          if (effectsToAdd) {
              effectsToAdd.forEach(effect => {
                  if (effect !== activeEffect || effect.allowRecurse) {
                      effects.add(effect);
                  }
              });
          }
      };
      if (type === "clear" /* CLEAR */) {
          // collection being cleared
          // trigger all effects for target
          depsMap.forEach(add);
      }
      else if (key === 'length' && isArray(target)) {
          depsMap.forEach((dep, key) => {
              if (key === 'length' || key >= newValue) {
                  add(dep);
              }
          });
      }
      else {
          // schedule runs for SET | ADD | DELETE
          if (key !== void 0) {
              add(depsMap.get(key));
          }
          // also run for iteration key on ADD | DELETE | Map.SET
          switch (type) {
              case "add" /* ADD */:
                  if (!isArray(target)) {
                      add(depsMap.get(ITERATE_KEY));
                      if (isMap(target)) {
                          add(depsMap.get(MAP_KEY_ITERATE_KEY));
                      }
                  }
                  else if (isIntegerKey(key)) {
                      // new index added to array -> length changes
                      add(depsMap.get('length'));
                  }
                  break;
              case "delete" /* DELETE */:
                  if (!isArray(target)) {
                      add(depsMap.get(ITERATE_KEY));
                      if (isMap(target)) {
                          add(depsMap.get(MAP_KEY_ITERATE_KEY));
                      }
                  }
                  break;
              case "set" /* SET */:
                  if (isMap(target)) {
                      add(depsMap.get(ITERATE_KEY));
                  }
                  break;
          }
      }
      const run = (effect) => {
          if (effect.options.onTrigger) {
              effect.options.onTrigger({
                  effect,
                  target,
                  key,
                  type,
                  newValue,
                  oldValue,
                  oldTarget
              });
          }
          if (effect.options.scheduler) {
              effect.options.scheduler(effect);
          }
          else {
              effect();
          }
      };
      effects.forEach(run);
  }

  const isNonTrackableKeys = /*#__PURE__*/ makeMap(`__proto__,__v_isRef,__isVue`);
  const builtInSymbols = new Set(Object.getOwnPropertyNames(Symbol)
      .map(key => Symbol[key])
      .filter(isSymbol));
  const get = /*#__PURE__*/ createGetter();
  const shallowGet = /*#__PURE__*/ createGetter(false, true);
  const readonlyGet = /*#__PURE__*/ createGetter(true);
  const shallowReadonlyGet = /*#__PURE__*/ createGetter(true, true);
  const arrayInstrumentations = {};
  ['includes', 'indexOf', 'lastIndexOf'].forEach(key => {
      const method = Array.prototype[key];
      arrayInstrumentations[key] = function (...args) {
          const arr = toRaw(this);
          for (let i = 0, l = this.length; i < l; i++) {
              track(arr, "get" /* GET */, i + '');
          }
          // we run the method using the original args first (which may be reactive)
          const res = method.apply(arr, args);
          if (res === -1 || res === false) {
              // if that didn't work, run it again using raw values.
              return method.apply(arr, args.map(toRaw));
          }
          else {
              return res;
          }
      };
  });
  ['push', 'pop', 'shift', 'unshift', 'splice'].forEach(key => {
      const method = Array.prototype[key];
      arrayInstrumentations[key] = function (...args) {
          pauseTracking();
          const res = method.apply(this, args);
          resetTracking();
          return res;
      };
  });
  function createGetter(isReadonly = false, shallow = false) {
      return function get(target, key, receiver) {
          if (key === "__v_isReactive" /* IS_REACTIVE */) {
              return !isReadonly;
          }
          else if (key === "__v_isReadonly" /* IS_READONLY */) {
              return isReadonly;
          }
          else if (key === "__v_raw" /* RAW */ &&
              receiver ===
                  (isReadonly
                      ? shallow
                          ? shallowReadonlyMap
                          : readonlyMap
                      : shallow
                          ? shallowReactiveMap
                          : reactiveMap).get(target)) {
              return target;
          }
          const targetIsArray = isArray(target);
          if (!isReadonly && targetIsArray && hasOwn(arrayInstrumentations, key)) {
              return Reflect.get(arrayInstrumentations, key, receiver);
          }
          const res = Reflect.get(target, key, receiver);
          if (isSymbol(key)
              ? builtInSymbols.has(key)
              : isNonTrackableKeys(key)) {
              return res;
          }
          if (!isReadonly) {
              track(target, "get" /* GET */, key);
          }
          if (shallow) {
              return res;
          }
          if (isRef(res)) {
              // ref unwrapping - does not apply for Array + integer key.
              const shouldUnwrap = !targetIsArray || !isIntegerKey(key);
              return shouldUnwrap ? res.value : res;
          }
          if (isObject(res)) {
              // Convert returned value into a proxy as well. we do the isObject check
              // here to avoid invalid value warning. Also need to lazy access readonly
              // and reactive here to avoid circular dependency.
              return isReadonly ? readonly(res) : reactive(res);
          }
          return res;
      };
  }
  const set = /*#__PURE__*/ createSetter();
  const shallowSet = /*#__PURE__*/ createSetter(true);
  function createSetter(shallow = false) {
      return function set(target, key, value, receiver) {
          let oldValue = target[key];
          if (!shallow) {
              value = toRaw(value);
              oldValue = toRaw(oldValue);
              if (!isArray(target) && isRef(oldValue) && !isRef(value)) {
                  oldValue.value = value;
                  return true;
              }
          }
          const hadKey = isArray(target) && isIntegerKey(key)
              ? Number(key) < target.length
              : hasOwn(target, key);
          const result = Reflect.set(target, key, value, receiver);
          // don't trigger if target is something up in the prototype chain of original
          if (target === toRaw(receiver)) {
              if (!hadKey) {
                  trigger(target, "add" /* ADD */, key, value);
              }
              else if (hasChanged(value, oldValue)) {
                  trigger(target, "set" /* SET */, key, value, oldValue);
              }
          }
          return result;
      };
  }
  function deleteProperty(target, key) {
      const hadKey = hasOwn(target, key);
      const oldValue = target[key];
      const result = Reflect.deleteProperty(target, key);
      if (result && hadKey) {
          trigger(target, "delete" /* DELETE */, key, undefined, oldValue);
      }
      return result;
  }
  function has(target, key) {
      const result = Reflect.has(target, key);
      if (!isSymbol(key) || !builtInSymbols.has(key)) {
          track(target, "has" /* HAS */, key);
      }
      return result;
  }
  function ownKeys(target) {
      track(target, "iterate" /* ITERATE */, isArray(target) ? 'length' : ITERATE_KEY);
      return Reflect.ownKeys(target);
  }
  const mutableHandlers = {
      get,
      set,
      deleteProperty,
      has,
      ownKeys
  };
  const readonlyHandlers = {
      get: readonlyGet,
      set(target, key) {
          {
              console.warn(`Set operation on key "${String(key)}" failed: target is readonly.`, target);
          }
          return true;
      },
      deleteProperty(target, key) {
          {
              console.warn(`Delete operation on key "${String(key)}" failed: target is readonly.`, target);
          }
          return true;
      }
  };
  const shallowReactiveHandlers = extend({}, mutableHandlers, {
      get: shallowGet,
      set: shallowSet
  });
  // Props handlers are special in the sense that it should not unwrap top-level
  // refs (in order to allow refs to be explicitly passed down), but should
  // retain the reactivity of the normal readonly object.
  const shallowReadonlyHandlers = extend({}, readonlyHandlers, {
      get: shallowReadonlyGet
  });

  const toReactive = (value) => isObject(value) ? reactive(value) : value;
  const toReadonly = (value) => isObject(value) ? readonly(value) : value;
  const toShallow = (value) => value;
  const getProto = (v) => Reflect.getPrototypeOf(v);
  function get$1(target, key, isReadonly = false, isShallow = false) {
      // #1772: readonly(reactive(Map)) should return readonly + reactive version
      // of the value
      target = target["__v_raw" /* RAW */];
      const rawTarget = toRaw(target);
      const rawKey = toRaw(key);
      if (key !== rawKey) {
          !isReadonly && track(rawTarget, "get" /* GET */, key);
      }
      !isReadonly && track(rawTarget, "get" /* GET */, rawKey);
      const { has } = getProto(rawTarget);
      const wrap = isShallow ? toShallow : isReadonly ? toReadonly : toReactive;
      if (has.call(rawTarget, key)) {
          return wrap(target.get(key));
      }
      else if (has.call(rawTarget, rawKey)) {
          return wrap(target.get(rawKey));
      }
  }
  function has$1(key, isReadonly = false) {
      const target = this["__v_raw" /* RAW */];
      const rawTarget = toRaw(target);
      const rawKey = toRaw(key);
      if (key !== rawKey) {
          !isReadonly && track(rawTarget, "has" /* HAS */, key);
      }
      !isReadonly && track(rawTarget, "has" /* HAS */, rawKey);
      return key === rawKey
          ? target.has(key)
          : target.has(key) || target.has(rawKey);
  }
  function size(target, isReadonly = false) {
      target = target["__v_raw" /* RAW */];
      !isReadonly && track(toRaw(target), "iterate" /* ITERATE */, ITERATE_KEY);
      return Reflect.get(target, 'size', target);
  }
  function add(value) {
      value = toRaw(value);
      const target = toRaw(this);
      const proto = getProto(target);
      const hadKey = proto.has.call(target, value);
      if (!hadKey) {
          target.add(value);
          trigger(target, "add" /* ADD */, value, value);
      }
      return this;
  }
  function set$1(key, value) {
      value = toRaw(value);
      const target = toRaw(this);
      const { has, get } = getProto(target);
      let hadKey = has.call(target, key);
      if (!hadKey) {
          key = toRaw(key);
          hadKey = has.call(target, key);
      }
      else {
          checkIdentityKeys(target, has, key);
      }
      const oldValue = get.call(target, key);
      target.set(key, value);
      if (!hadKey) {
          trigger(target, "add" /* ADD */, key, value);
      }
      else if (hasChanged(value, oldValue)) {
          trigger(target, "set" /* SET */, key, value, oldValue);
      }
      return this;
  }
  function deleteEntry(key) {
      const target = toRaw(this);
      const { has, get } = getProto(target);
      let hadKey = has.call(target, key);
      if (!hadKey) {
          key = toRaw(key);
          hadKey = has.call(target, key);
      }
      else {
          checkIdentityKeys(target, has, key);
      }
      const oldValue = get ? get.call(target, key) : undefined;
      // forward the operation before queueing reactions
      const result = target.delete(key);
      if (hadKey) {
          trigger(target, "delete" /* DELETE */, key, undefined, oldValue);
      }
      return result;
  }
  function clear() {
      const target = toRaw(this);
      const hadItems = target.size !== 0;
      const oldTarget = isMap(target)
              ? new Map(target)
              : new Set(target)
          ;
      // forward the operation before queueing reactions
      const result = target.clear();
      if (hadItems) {
          trigger(target, "clear" /* CLEAR */, undefined, undefined, oldTarget);
      }
      return result;
  }
  function createForEach(isReadonly, isShallow) {
      return function forEach(callback, thisArg) {
          const observed = this;
          const target = observed["__v_raw" /* RAW */];
          const rawTarget = toRaw(target);
          const wrap = isShallow ? toShallow : isReadonly ? toReadonly : toReactive;
          !isReadonly && track(rawTarget, "iterate" /* ITERATE */, ITERATE_KEY);
          return target.forEach((value, key) => {
              // important: make sure the callback is
              // 1. invoked with the reactive map as `this` and 3rd arg
              // 2. the value received should be a corresponding reactive/readonly.
              return callback.call(thisArg, wrap(value), wrap(key), observed);
          });
      };
  }
  function createIterableMethod(method, isReadonly, isShallow) {
      return function (...args) {
          const target = this["__v_raw" /* RAW */];
          const rawTarget = toRaw(target);
          const targetIsMap = isMap(rawTarget);
          const isPair = method === 'entries' || (method === Symbol.iterator && targetIsMap);
          const isKeyOnly = method === 'keys' && targetIsMap;
          const innerIterator = target[method](...args);
          const wrap = isShallow ? toShallow : isReadonly ? toReadonly : toReactive;
          !isReadonly &&
              track(rawTarget, "iterate" /* ITERATE */, isKeyOnly ? MAP_KEY_ITERATE_KEY : ITERATE_KEY);
          // return a wrapped iterator which returns observed versions of the
          // values emitted from the real iterator
          return {
              // iterator protocol
              next() {
                  const { value, done } = innerIterator.next();
                  return done
                      ? { value, done }
                      : {
                          value: isPair ? [wrap(value[0]), wrap(value[1])] : wrap(value),
                          done
                      };
              },
              // iterable protocol
              [Symbol.iterator]() {
                  return this;
              }
          };
      };
  }
  function createReadonlyMethod(type) {
      return function (...args) {
          {
              const key = args[0] ? `on key "${args[0]}" ` : ``;
              console.warn(`${capitalize(type)} operation ${key}failed: target is readonly.`, toRaw(this));
          }
          return type === "delete" /* DELETE */ ? false : this;
      };
  }
  const mutableInstrumentations = {
      get(key) {
          return get$1(this, key);
      },
      get size() {
          return size(this);
      },
      has: has$1,
      add,
      set: set$1,
      delete: deleteEntry,
      clear,
      forEach: createForEach(false, false)
  };
  const shallowInstrumentations = {
      get(key) {
          return get$1(this, key, false, true);
      },
      get size() {
          return size(this);
      },
      has: has$1,
      add,
      set: set$1,
      delete: deleteEntry,
      clear,
      forEach: createForEach(false, true)
  };
  const readonlyInstrumentations = {
      get(key) {
          return get$1(this, key, true);
      },
      get size() {
          return size(this, true);
      },
      has(key) {
          return has$1.call(this, key, true);
      },
      add: createReadonlyMethod("add" /* ADD */),
      set: createReadonlyMethod("set" /* SET */),
      delete: createReadonlyMethod("delete" /* DELETE */),
      clear: createReadonlyMethod("clear" /* CLEAR */),
      forEach: createForEach(true, false)
  };
  const shallowReadonlyInstrumentations = {
      get(key) {
          return get$1(this, key, true, true);
      },
      get size() {
          return size(this, true);
      },
      has(key) {
          return has$1.call(this, key, true);
      },
      add: createReadonlyMethod("add" /* ADD */),
      set: createReadonlyMethod("set" /* SET */),
      delete: createReadonlyMethod("delete" /* DELETE */),
      clear: createReadonlyMethod("clear" /* CLEAR */),
      forEach: createForEach(true, true)
  };
  const iteratorMethods = ['keys', 'values', 'entries', Symbol.iterator];
  iteratorMethods.forEach(method => {
      mutableInstrumentations[method] = createIterableMethod(method, false, false);
      readonlyInstrumentations[method] = createIterableMethod(method, true, false);
      shallowInstrumentations[method] = createIterableMethod(method, false, true);
      shallowReadonlyInstrumentations[method] = createIterableMethod(method, true, true);
  });
  function createInstrumentationGetter(isReadonly, shallow) {
      const instrumentations = shallow
          ? isReadonly
              ? shallowReadonlyInstrumentations
              : shallowInstrumentations
          : isReadonly
              ? readonlyInstrumentations
              : mutableInstrumentations;
      return (target, key, receiver) => {
          if (key === "__v_isReactive" /* IS_REACTIVE */) {
              return !isReadonly;
          }
          else if (key === "__v_isReadonly" /* IS_READONLY */) {
              return isReadonly;
          }
          else if (key === "__v_raw" /* RAW */) {
              return target;
          }
          return Reflect.get(hasOwn(instrumentations, key) && key in target
              ? instrumentations
              : target, key, receiver);
      };
  }
  const mutableCollectionHandlers = {
      get: createInstrumentationGetter(false, false)
  };
  const shallowCollectionHandlers = {
      get: createInstrumentationGetter(false, true)
  };
  const readonlyCollectionHandlers = {
      get: createInstrumentationGetter(true, false)
  };
  const shallowReadonlyCollectionHandlers = {
      get: createInstrumentationGetter(true, true)
  };
  function checkIdentityKeys(target, has, key) {
      const rawKey = toRaw(key);
      if (rawKey !== key && has.call(target, rawKey)) {
          const type = toRawType(target);
          console.warn(`Reactive ${type} contains both the raw and reactive ` +
              `versions of the same object${type === `Map` ? ` as keys` : ``}, ` +
              `which can lead to inconsistencies. ` +
              `Avoid differentiating between the raw and reactive versions ` +
              `of an object and only use the reactive version if possible.`);
      }
  }

  const reactiveMap = new WeakMap();
  const shallowReactiveMap = new WeakMap();
  const readonlyMap = new WeakMap();
  const shallowReadonlyMap = new WeakMap();
  function targetTypeMap(rawType) {
      switch (rawType) {
          case 'Object':
          case 'Array':
              return 1 /* COMMON */;
          case 'Map':
          case 'Set':
          case 'WeakMap':
          case 'WeakSet':
              return 2 /* COLLECTION */;
          default:
              return 0 /* INVALID */;
      }
  }
  function getTargetType(value) {
      return value["__v_skip" /* SKIP */] || !Object.isExtensible(value)
          ? 0 /* INVALID */
          : targetTypeMap(toRawType(value));
  }
  function reactive(target) {
      // if trying to observe a readonly proxy, return the readonly version.
      if (target && target["__v_isReadonly" /* IS_READONLY */]) {
          return target;
      }
      return createReactiveObject(target, false, mutableHandlers, mutableCollectionHandlers, reactiveMap);
  }
  /**
   * Return a shallowly-reactive copy of the original object, where only the root
   * level properties are reactive. It also does not auto-unwrap refs (even at the
   * root level).
   */
  function shallowReactive(target) {
      return createReactiveObject(target, false, shallowReactiveHandlers, shallowCollectionHandlers, shallowReactiveMap);
  }
  /**
   * Creates a readonly copy of the original object. Note the returned copy is not
   * made reactive, but `readonly` can be called on an already reactive object.
   */
  function readonly(target) {
      return createReactiveObject(target, true, readonlyHandlers, readonlyCollectionHandlers, readonlyMap);
  }
  /**
   * Returns a reactive-copy of the original object, where only the root level
   * properties are readonly, and does NOT unwrap refs nor recursively convert
   * returned properties.
   * This is used for creating the props proxy object for stateful components.
   */
  function shallowReadonly(target) {
      return createReactiveObject(target, true, shallowReadonlyHandlers, shallowReadonlyCollectionHandlers, shallowReadonlyMap);
  }
  function createReactiveObject(target, isReadonly, baseHandlers, collectionHandlers, proxyMap) {
      if (!isObject(target)) {
          {
              console.warn(`value cannot be made reactive: ${String(target)}`);
          }
          return target;
      }
      // target is already a Proxy, return it.
      // exception: calling readonly() on a reactive object
      if (target["__v_raw" /* RAW */] &&
          !(isReadonly && target["__v_isReactive" /* IS_REACTIVE */])) {
          return target;
      }
      // target already has corresponding Proxy
      const existingProxy = proxyMap.get(target);
      if (existingProxy) {
          return existingProxy;
      }
      // only a whitelist of value types can be observed.
      const targetType = getTargetType(target);
      if (targetType === 0 /* INVALID */) {
          return target;
      }
      const proxy = new Proxy(target, targetType === 2 /* COLLECTION */ ? collectionHandlers : baseHandlers);
      proxyMap.set(target, proxy);
      return proxy;
  }
  function isReactive(value) {
      if (isReadonly(value)) {
          return isReactive(value["__v_raw" /* RAW */]);
      }
      return !!(value && value["__v_isReactive" /* IS_REACTIVE */]);
  }
  function isReadonly(value) {
      return !!(value && value["__v_isReadonly" /* IS_READONLY */]);
  }
  function isProxy(value) {
      return isReactive(value) || isReadonly(value);
  }
  function toRaw(observed) {
      return ((observed && toRaw(observed["__v_raw" /* RAW */])) || observed);
  }
  function markRaw(value) {
      def(value, "__v_skip" /* SKIP */, true);
      return value;
  }

  const convert = (val) => isObject(val) ? reactive(val) : val;
  function isRef(r) {
      return Boolean(r && r.__v_isRef === true);
  }
  function ref(value) {
      return createRef(value);
  }
  function shallowRef(value) {
      return createRef(value, true);
  }
  class RefImpl {
      constructor(_rawValue, _shallow = false) {
          this._rawValue = _rawValue;
          this._shallow = _shallow;
          this.__v_isRef = true;
          this._value = _shallow ? _rawValue : convert(_rawValue);
      }
      get value() {
          track(toRaw(this), "get" /* GET */, 'value');
          return this._value;
      }
      set value(newVal) {
          if (hasChanged(toRaw(newVal), this._rawValue)) {
              this._rawValue = newVal;
              this._value = this._shallow ? newVal : convert(newVal);
              trigger(toRaw(this), "set" /* SET */, 'value', newVal);
          }
      }
  }
  function createRef(rawValue, shallow = false) {
      if (isRef(rawValue)) {
          return rawValue;
      }
      return new RefImpl(rawValue, shallow);
  }
  function triggerRef(ref) {
      trigger(toRaw(ref), "set" /* SET */, 'value', ref.value );
  }
  function unref(ref) {
      return isRef(ref) ? ref.value : ref;
  }
  const shallowUnwrapHandlers = {
      get: (target, key, receiver) => unref(Reflect.get(target, key, receiver)),
      set: (target, key, value, receiver) => {
          const oldValue = target[key];
          if (isRef(oldValue) && !isRef(value)) {
              oldValue.value = value;
              return true;
          }
          else {
              return Reflect.set(target, key, value, receiver);
          }
      }
  };
  function proxyRefs(objectWithRefs) {
      return isReactive(objectWithRefs)
          ? objectWithRefs
          : new Proxy(objectWithRefs, shallowUnwrapHandlers);
  }
  class CustomRefImpl {
      constructor(factory) {
          this.__v_isRef = true;
          const { get, set } = factory(() => track(this, "get" /* GET */, 'value'), () => trigger(this, "set" /* SET */, 'value'));
          this._get = get;
          this._set = set;
      }
      get value() {
          return this._get();
      }
      set value(newVal) {
          this._set(newVal);
      }
  }
  function customRef(factory) {
      return new CustomRefImpl(factory);
  }
  function toRefs(object) {
      if (!isProxy(object)) {
          console.warn(`toRefs() expects a reactive object but received a plain one.`);
      }
      const ret = isArray(object) ? new Array(object.length) : {};
      for (const key in object) {
          ret[key] = toRef(object, key);
      }
      return ret;
  }
  class ObjectRefImpl {
      constructor(_object, _key) {
          this._object = _object;
          this._key = _key;
          this.__v_isRef = true;
      }
      get value() {
          return this._object[this._key];
      }
      set value(newVal) {
          this._object[this._key] = newVal;
      }
  }
  function toRef(object, key) {
      return isRef(object[key])
          ? object[key]
          : new ObjectRefImpl(object, key);
  }

  class ComputedRefImpl {
      constructor(getter, _setter, isReadonly) {
          this._setter = _setter;
          this._dirty = true;
          this.__v_isRef = true;
          this.effect = effect(getter, {
              lazy: true,
              scheduler: () => {
                  if (!this._dirty) {
                      this._dirty = true;
                      trigger(toRaw(this), "set" /* SET */, 'value');
                  }
              }
          });
          this["__v_isReadonly" /* IS_READONLY */] = isReadonly;
      }
      get value() {
          // the computed ref may get wrapped by other proxies e.g. readonly() #3376
          const self = toRaw(this);
          if (self._dirty) {
              self._value = this.effect();
              self._dirty = false;
          }
          track(self, "get" /* GET */, 'value');
          return self._value;
      }
      set value(newValue) {
          this._setter(newValue);
      }
  }
  function computed(getterOrOptions) {
      let getter;
      let setter;
      if (isFunction(getterOrOptions)) {
          getter = getterOrOptions;
          setter = () => {
                  console.warn('Write operation failed: computed value is readonly');
              }
              ;
      }
      else {
          getter = getterOrOptions.get;
          setter = getterOrOptions.set;
      }
      return new ComputedRefImpl(getter, setter, isFunction(getterOrOptions) || !getterOrOptions.set);
  }

  const stack = [];
  function pushWarningContext(vnode) {
      stack.push(vnode);
  }
  function popWarningContext() {
      stack.pop();
  }
  function warn(msg, ...args) {
      // avoid props formatting or warn handler tracking deps that might be mutated
      // during patch, leading to infinite recursion.
      pauseTracking();
      const instance = stack.length ? stack[stack.length - 1].component : null;
      const appWarnHandler = instance && instance.appContext.config.warnHandler;
      const trace = getComponentTrace();
      if (appWarnHandler) {
          callWithErrorHandling(appWarnHandler, instance, 11 /* APP_WARN_HANDLER */, [
              msg + args.join(''),
              instance && instance.proxy,
              trace
                  .map(({ vnode }) => `at <${formatComponentName(instance, vnode.type)}>`)
                  .join('\n'),
              trace
          ]);
      }
      else {
          const warnArgs = [`[Vue warn]: ${msg}`, ...args];
          /* istanbul ignore if */
          if (trace.length &&
              // avoid spamming console during tests
              !false) {
              warnArgs.push(`\n`, ...formatTrace(trace));
          }
          console.warn(...warnArgs);
      }
      resetTracking();
  }
  function getComponentTrace() {
      let currentVNode = stack[stack.length - 1];
      if (!currentVNode) {
          return [];
      }
      // we can't just use the stack because it will be incomplete during updates
      // that did not start from the root. Re-construct the parent chain using
      // instance parent pointers.
      const normalizedStack = [];
      while (currentVNode) {
          const last = normalizedStack[0];
          if (last && last.vnode === currentVNode) {
              last.recurseCount++;
          }
          else {
              normalizedStack.push({
                  vnode: currentVNode,
                  recurseCount: 0
              });
          }
          const parentInstance = currentVNode.component && currentVNode.component.parent;
          currentVNode = parentInstance && parentInstance.vnode;
      }
      return normalizedStack;
  }
  /* istanbul ignore next */
  function formatTrace(trace) {
      const logs = [];
      trace.forEach((entry, i) => {
          logs.push(...(i === 0 ? [] : [`\n`]), ...formatTraceEntry(entry));
      });
      return logs;
  }
  function formatTraceEntry({ vnode, recurseCount }) {
      const postfix = recurseCount > 0 ? `... (${recurseCount} recursive calls)` : ``;
      const isRoot = vnode.component ? vnode.component.parent == null : false;
      const open = ` at <${formatComponentName(vnode.component, vnode.type, isRoot)}`;
      const close = `>` + postfix;
      return vnode.props
          ? [open, ...formatProps(vnode.props), close]
          : [open + close];
  }
  /* istanbul ignore next */
  function formatProps(props) {
      const res = [];
      const keys = Object.keys(props);
      keys.slice(0, 3).forEach(key => {
          res.push(...formatProp(key, props[key]));
      });
      if (keys.length > 3) {
          res.push(` ...`);
      }
      return res;
  }
  /* istanbul ignore next */
  function formatProp(key, value, raw) {
      if (isString(value)) {
          value = JSON.stringify(value);
          return raw ? value : [`${key}=${value}`];
      }
      else if (typeof value === 'number' ||
          typeof value === 'boolean' ||
          value == null) {
          return raw ? value : [`${key}=${value}`];
      }
      else if (isRef(value)) {
          value = formatProp(key, toRaw(value.value), true);
          return raw ? value : [`${key}=Ref<`, value, `>`];
      }
      else if (isFunction(value)) {
          return [`${key}=fn${value.name ? `<${value.name}>` : ``}`];
      }
      else {
          value = toRaw(value);
          return raw ? value : [`${key}=`, value];
      }
  }

  const ErrorTypeStrings = {
      ["bc" /* BEFORE_CREATE */]: 'beforeCreate hook',
      ["c" /* CREATED */]: 'created hook',
      ["bm" /* BEFORE_MOUNT */]: 'beforeMount hook',
      ["m" /* MOUNTED */]: 'mounted hook',
      ["bu" /* BEFORE_UPDATE */]: 'beforeUpdate hook',
      ["u" /* UPDATED */]: 'updated',
      ["bum" /* BEFORE_UNMOUNT */]: 'beforeUnmount hook',
      ["um" /* UNMOUNTED */]: 'unmounted hook',
      ["a" /* ACTIVATED */]: 'activated hook',
      ["da" /* DEACTIVATED */]: 'deactivated hook',
      ["ec" /* ERROR_CAPTURED */]: 'errorCaptured hook',
      ["rtc" /* RENDER_TRACKED */]: 'renderTracked hook',
      ["rtg" /* RENDER_TRIGGERED */]: 'renderTriggered hook',
      [0 /* SETUP_FUNCTION */]: 'setup function',
      [1 /* RENDER_FUNCTION */]: 'render function',
      [2 /* WATCH_GETTER */]: 'watcher getter',
      [3 /* WATCH_CALLBACK */]: 'watcher callback',
      [4 /* WATCH_CLEANUP */]: 'watcher cleanup function',
      [5 /* NATIVE_EVENT_HANDLER */]: 'native event handler',
      [6 /* COMPONENT_EVENT_HANDLER */]: 'component event handler',
      [7 /* VNODE_HOOK */]: 'vnode hook',
      [8 /* DIRECTIVE_HOOK */]: 'directive hook',
      [9 /* TRANSITION_HOOK */]: 'transition hook',
      [10 /* APP_ERROR_HANDLER */]: 'app errorHandler',
      [11 /* APP_WARN_HANDLER */]: 'app warnHandler',
      [12 /* FUNCTION_REF */]: 'ref function',
      [13 /* ASYNC_COMPONENT_LOADER */]: 'async component loader',
      [14 /* SCHEDULER */]: 'scheduler flush. This is likely a Vue internals bug. ' +
          'Please open an issue at https://new-issue.vuejs.org/?repo=vuejs/vue-next'
  };
  function callWithErrorHandling(fn, instance, type, args) {
      let res;
      try {
          res = args ? fn(...args) : fn();
      }
      catch (err) {
          handleError(err, instance, type);
      }
      return res;
  }
  function callWithAsyncErrorHandling(fn, instance, type, args) {
      if (isFunction(fn)) {
          const res = callWithErrorHandling(fn, instance, type, args);
          if (res && isPromise(res)) {
              res.catch(err => {
                  handleError(err, instance, type);
              });
          }
          return res;
      }
      const values = [];
      for (let i = 0; i < fn.length; i++) {
          values.push(callWithAsyncErrorHandling(fn[i], instance, type, args));
      }
      return values;
  }
  function handleError(err, instance, type, throwInDev = true) {
      const contextVNode = instance ? instance.vnode : null;
      if (instance) {
          let cur = instance.parent;
          // the exposed instance is the render proxy to keep it consistent with 2.x
          const exposedInstance = instance.proxy;
          // in production the hook receives only the error code
          const errorInfo = ErrorTypeStrings[type] ;
          while (cur) {
              const errorCapturedHooks = cur.ec;
              if (errorCapturedHooks) {
                  for (let i = 0; i < errorCapturedHooks.length; i++) {
                      if (errorCapturedHooks[i](err, exposedInstance, errorInfo) === false) {
                          return;
                      }
                  }
              }
              cur = cur.parent;
          }
          // app-level handling
          const appErrorHandler = instance.appContext.config.errorHandler;
          if (appErrorHandler) {
              callWithErrorHandling(appErrorHandler, null, 10 /* APP_ERROR_HANDLER */, [err, exposedInstance, errorInfo]);
              return;
          }
      }
      logError(err, type, contextVNode, throwInDev);
  }
  function logError(err, type, contextVNode, throwInDev = true) {
      {
          const info = ErrorTypeStrings[type];
          if (contextVNode) {
              pushWarningContext(contextVNode);
          }
          warn(`Unhandled error${info ? ` during execution of ${info}` : ``}`);
          if (contextVNode) {
              popWarningContext();
          }
          // crash in dev by default so it's more noticeable
          if (throwInDev) {
              throw err;
          }
          else {
              console.error(err);
          }
      }
  }

  let isFlushing = false;
  let isFlushPending = false;
  const queue = [];
  let flushIndex = 0;
  const pendingPreFlushCbs = [];
  let activePreFlushCbs = null;
  let preFlushIndex = 0;
  const pendingPostFlushCbs = [];
  let activePostFlushCbs = null;
  let postFlushIndex = 0;
  const resolvedPromise = Promise.resolve();
  let currentFlushPromise = null;
  let currentPreFlushParentJob = null;
  const RECURSION_LIMIT = 100;
  function nextTick(fn) {
      const p = currentFlushPromise || resolvedPromise;
      return fn ? p.then(this ? fn.bind(this) : fn) : p;
  }
  // #2768
  // Use binary-search to find a suitable position in the queue,
  // so that the queue maintains the increasing order of job's id,
  // which can prevent the job from being skipped and also can avoid repeated patching.
  function findInsertionIndex(job) {
      // the start index should be `flushIndex + 1`
      let start = flushIndex + 1;
      let end = queue.length;
      const jobId = getId(job);
      while (start < end) {
          const middle = (start + end) >>> 1;
          const middleJobId = getId(queue[middle]);
          middleJobId < jobId ? (start = middle + 1) : (end = middle);
      }
      return start;
  }
  function queueJob(job) {
      // the dedupe search uses the startIndex argument of Array.includes()
      // by default the search index includes the current job that is being run
      // so it cannot recursively trigger itself again.
      // if the job is a watch() callback, the search will start with a +1 index to
      // allow it recursively trigger itself - it is the user's responsibility to
      // ensure it doesn't end up in an infinite loop.
      if ((!queue.length ||
          !queue.includes(job, isFlushing && job.allowRecurse ? flushIndex + 1 : flushIndex)) &&
          job !== currentPreFlushParentJob) {
          const pos = findInsertionIndex(job);
          if (pos > -1) {
              queue.splice(pos, 0, job);
          }
          else {
              queue.push(job);
          }
          queueFlush();
      }
  }
  function queueFlush() {
      if (!isFlushing && !isFlushPending) {
          isFlushPending = true;
          currentFlushPromise = resolvedPromise.then(flushJobs);
      }
  }
  function invalidateJob(job) {
      const i = queue.indexOf(job);
      if (i > flushIndex) {
          queue.splice(i, 1);
      }
  }
  function queueCb(cb, activeQueue, pendingQueue, index) {
      if (!isArray(cb)) {
          if (!activeQueue ||
              !activeQueue.includes(cb, cb.allowRecurse ? index + 1 : index)) {
              pendingQueue.push(cb);
          }
      }
      else {
          // if cb is an array, it is a component lifecycle hook which can only be
          // triggered by a job, which is already deduped in the main queue, so
          // we can skip duplicate check here to improve perf
          pendingQueue.push(...cb);
      }
      queueFlush();
  }
  function queuePreFlushCb(cb) {
      queueCb(cb, activePreFlushCbs, pendingPreFlushCbs, preFlushIndex);
  }
  function queuePostFlushCb(cb) {
      queueCb(cb, activePostFlushCbs, pendingPostFlushCbs, postFlushIndex);
  }
  function flushPreFlushCbs(seen, parentJob = null) {
      if (pendingPreFlushCbs.length) {
          currentPreFlushParentJob = parentJob;
          activePreFlushCbs = [...new Set(pendingPreFlushCbs)];
          pendingPreFlushCbs.length = 0;
          {
              seen = seen || new Map();
          }
          for (preFlushIndex = 0; preFlushIndex < activePreFlushCbs.length; preFlushIndex++) {
              {
                  checkRecursiveUpdates(seen, activePreFlushCbs[preFlushIndex]);
              }
              activePreFlushCbs[preFlushIndex]();
          }
          activePreFlushCbs = null;
          preFlushIndex = 0;
          currentPreFlushParentJob = null;
          // recursively flush until it drains
          flushPreFlushCbs(seen, parentJob);
      }
  }
  function flushPostFlushCbs(seen) {
      if (pendingPostFlushCbs.length) {
          const deduped = [...new Set(pendingPostFlushCbs)];
          pendingPostFlushCbs.length = 0;
          // #1947 already has active queue, nested flushPostFlushCbs call
          if (activePostFlushCbs) {
              activePostFlushCbs.push(...deduped);
              return;
          }
          activePostFlushCbs = deduped;
          {
              seen = seen || new Map();
          }
          activePostFlushCbs.sort((a, b) => getId(a) - getId(b));
          for (postFlushIndex = 0; postFlushIndex < activePostFlushCbs.length; postFlushIndex++) {
              {
                  checkRecursiveUpdates(seen, activePostFlushCbs[postFlushIndex]);
              }
              activePostFlushCbs[postFlushIndex]();
          }
          activePostFlushCbs = null;
          postFlushIndex = 0;
      }
  }
  const getId = (job) => job.id == null ? Infinity : job.id;
  function flushJobs(seen) {
      isFlushPending = false;
      isFlushing = true;
      {
          seen = seen || new Map();
      }
      flushPreFlushCbs(seen);
      // Sort queue before flush.
      // This ensures that:
      // 1. Components are updated from parent to child. (because parent is always
      //    created before the child so its render effect will have smaller
      //    priority number)
      // 2. If a component is unmounted during a parent component's update,
      //    its update can be skipped.
      queue.sort((a, b) => getId(a) - getId(b));
      try {
          for (flushIndex = 0; flushIndex < queue.length; flushIndex++) {
              const job = queue[flushIndex];
              if (job) {
                  if (true) {
                      checkRecursiveUpdates(seen, job);
                  }
                  callWithErrorHandling(job, null, 14 /* SCHEDULER */);
              }
          }
      }
      finally {
          flushIndex = 0;
          queue.length = 0;
          flushPostFlushCbs(seen);
          isFlushing = false;
          currentFlushPromise = null;
          // some postFlushCb queued jobs!
          // keep flushing until it drains.
          if (queue.length || pendingPostFlushCbs.length) {
              flushJobs(seen);
          }
      }
  }
  function checkRecursiveUpdates(seen, fn) {
      if (!seen.has(fn)) {
          seen.set(fn, 1);
      }
      else {
          const count = seen.get(fn);
          if (count > RECURSION_LIMIT) {
              throw new Error(`Maximum recursive updates exceeded. ` +
                  `This means you have a reactive effect that is mutating its own ` +
                  `dependencies and thus recursively triggering itself. Possible sources ` +
                  `include component template, render function, updated hook or ` +
                  `watcher source function.`);
          }
          else {
              seen.set(fn, count + 1);
          }
      }
  }

  /* eslint-disable no-restricted-globals */
  let isHmrUpdating = false;
  const hmrDirtyComponents = new Set();
  // Expose the HMR runtime on the global object
  // This makes it entirely tree-shakable without polluting the exports and makes
  // it easier to be used in toolings like vue-loader
  // Note: for a component to be eligible for HMR it also needs the __hmrId option
  // to be set so that its instances can be registered / removed.
  {
      const globalObject = typeof global !== 'undefined'
          ? global
          : typeof self !== 'undefined'
              ? self
              : typeof window !== 'undefined'
                  ? window
                  : {};
      globalObject.__VUE_HMR_RUNTIME__ = {
          createRecord: tryWrap(createRecord),
          rerender: tryWrap(rerender),
          reload: tryWrap(reload)
      };
  }
  const map = new Map();
  function registerHMR(instance) {
      const id = instance.type.__hmrId;
      let record = map.get(id);
      if (!record) {
          createRecord(id, instance.type);
          record = map.get(id);
      }
      record.instances.add(instance);
  }
  function unregisterHMR(instance) {
      map.get(instance.type.__hmrId).instances.delete(instance);
  }
  function createRecord(id, component) {
      if (!component) {
          warn(`HMR API usage is out of date.\n` +
              `Please upgrade vue-loader/vite/rollup-plugin-vue or other relevant ` +
              `dependency that handles Vue SFC compilation.`);
          component = {};
      }
      if (map.has(id)) {
          return false;
      }
      map.set(id, {
          component: isClassComponent(component) ? component.__vccOpts : component,
          instances: new Set()
      });
      return true;
  }
  function rerender(id, newRender) {
      const record = map.get(id);
      if (!record)
          return;
      if (newRender)
          record.component.render = newRender;
      // Array.from creates a snapshot which avoids the set being mutated during
      // updates
      Array.from(record.instances).forEach(instance => {
          if (newRender) {
              instance.render = newRender;
          }
          instance.renderCache = [];
          // this flag forces child components with slot content to update
          isHmrUpdating = true;
          instance.update();
          isHmrUpdating = false;
      });
  }
  function reload(id, newComp) {
      const record = map.get(id);
      if (!record)
          return;
      // Array.from creates a snapshot which avoids the set being mutated during
      // updates
      const { component, instances } = record;
      if (!hmrDirtyComponents.has(component)) {
          // 1. Update existing comp definition to match new one
          newComp = isClassComponent(newComp) ? newComp.__vccOpts : newComp;
          extend(component, newComp);
          for (const key in component) {
              if (!(key in newComp)) {
                  delete component[key];
              }
          }
          // 2. Mark component dirty. This forces the renderer to replace the component
          // on patch.
          hmrDirtyComponents.add(component);
          // 3. Make sure to unmark the component after the reload.
          queuePostFlushCb(() => {
              hmrDirtyComponents.delete(component);
          });
      }
      Array.from(instances).forEach(instance => {
          if (instance.parent) {
              // 4. Force the parent instance to re-render. This will cause all updated
              // components to be unmounted and re-mounted. Queue the update so that we
              // don't end up forcing the same parent to re-render multiple times.
              queueJob(instance.parent.update);
          }
          else if (instance.appContext.reload) {
              // root instance mounted via createApp() has a reload method
              instance.appContext.reload();
          }
          else if (typeof window !== 'undefined') {
              // root instance inside tree created via raw render(). Force reload.
              window.location.reload();
          }
          else {
              console.warn('[HMR] Root or manually mounted instance modified. Full reload required.');
          }
      });
  }
  function tryWrap(fn) {
      return (id, arg) => {
          try {
              return fn(id, arg);
          }
          catch (e) {
              console.error(e);
              console.warn(`[HMR] Something went wrong during Vue component hot-reload. ` +
                  `Full reload required.`);
          }
      };
  }

  let devtools;
  function setDevtoolsHook(hook) {
      devtools = hook;
  }
  function devtoolsInitApp(app, version) {
      // TODO queue if devtools is undefined
      if (!devtools)
          return;
      devtools.emit("app:init" /* APP_INIT */, app, version, {
          Fragment,
          Text,
          Comment,
          Static
      });
  }
  function devtoolsUnmountApp(app) {
      if (!devtools)
          return;
      devtools.emit("app:unmount" /* APP_UNMOUNT */, app);
  }
  const devtoolsComponentAdded = /*#__PURE__*/ createDevtoolsComponentHook("component:added" /* COMPONENT_ADDED */);
  const devtoolsComponentUpdated = /*#__PURE__*/ createDevtoolsComponentHook("component:updated" /* COMPONENT_UPDATED */);
  const devtoolsComponentRemoved = /*#__PURE__*/ createDevtoolsComponentHook("component:removed" /* COMPONENT_REMOVED */);
  function createDevtoolsComponentHook(hook) {
      return (component) => {
          if (!devtools)
              return;
          devtools.emit(hook, component.appContext.app, component.uid, component.parent ? component.parent.uid : undefined, component);
      };
  }
  function devtoolsComponentEmit(component, event, params) {
      if (!devtools)
          return;
      devtools.emit("component:emit" /* COMPONENT_EMIT */, component.appContext.app, component, event, params);
  }

  function emit(instance, event, ...rawArgs) {
      const props = instance.vnode.props || EMPTY_OBJ;
      {
          const { emitsOptions, propsOptions: [propsOptions] } = instance;
          if (emitsOptions) {
              if (!(event in emitsOptions)) {
                  if (!propsOptions || !(toHandlerKey(event) in propsOptions)) {
                      warn(`Component emitted event "${event}" but it is neither declared in ` +
                          `the emits option nor as an "${toHandlerKey(event)}" prop.`);
                  }
              }
              else {
                  const validator = emitsOptions[event];
                  if (isFunction(validator)) {
                      const isValid = validator(...rawArgs);
                      if (!isValid) {
                          warn(`Invalid event arguments: event validation failed for event "${event}".`);
                      }
                  }
              }
          }
      }
      let args = rawArgs;
      const isModelListener = event.startsWith('update:');
      // for v-model update:xxx events, apply modifiers on args
      const modelArg = isModelListener && event.slice(7);
      if (modelArg && modelArg in props) {
          const modifiersKey = `${modelArg === 'modelValue' ? 'model' : modelArg}Modifiers`;
          const { number, trim } = props[modifiersKey] || EMPTY_OBJ;
          if (trim) {
              args = rawArgs.map(a => a.trim());
          }
          else if (number) {
              args = rawArgs.map(toNumber);
          }
      }
      {
          devtoolsComponentEmit(instance, event, args);
      }
      {
          const lowerCaseEvent = event.toLowerCase();
          if (lowerCaseEvent !== event && props[toHandlerKey(lowerCaseEvent)]) {
              warn(`Event "${lowerCaseEvent}" is emitted in component ` +
                  `${formatComponentName(instance, instance.type)} but the handler is registered for "${event}". ` +
                  `Note that HTML attributes are case-insensitive and you cannot use ` +
                  `v-on to listen to camelCase events when using in-DOM templates. ` +
                  `You should probably use "${hyphenate(event)}" instead of "${event}".`);
          }
      }
      let handlerName;
      let handler = props[(handlerName = toHandlerKey(event))] ||
          // also try camelCase event handler (#2249)
          props[(handlerName = toHandlerKey(camelize(event)))];
      // for v-model update:xxx events, also trigger kebab-case equivalent
      // for props passed via kebab-case
      if (!handler && isModelListener) {
          handler = props[(handlerName = toHandlerKey(hyphenate(event)))];
      }
      if (handler) {
          callWithAsyncErrorHandling(handler, instance, 6 /* COMPONENT_EVENT_HANDLER */, args);
      }
      const onceHandler = props[handlerName + `Once`];
      if (onceHandler) {
          if (!instance.emitted) {
              (instance.emitted = {})[handlerName] = true;
          }
          else if (instance.emitted[handlerName]) {
              return;
          }
          callWithAsyncErrorHandling(onceHandler, instance, 6 /* COMPONENT_EVENT_HANDLER */, args);
      }
  }
  function normalizeEmitsOptions(comp, appContext, asMixin = false) {
      if (!appContext.deopt && comp.__emits !== undefined) {
          return comp.__emits;
      }
      const raw = comp.emits;
      let normalized = {};
      // apply mixin/extends props
      let hasExtends = false;
      if (!isFunction(comp)) {
          const extendEmits = (raw) => {
              const normalizedFromExtend = normalizeEmitsOptions(raw, appContext, true);
              if (normalizedFromExtend) {
                  hasExtends = true;
                  extend(normalized, normalizedFromExtend);
              }
          };
          if (!asMixin && appContext.mixins.length) {
              appContext.mixins.forEach(extendEmits);
          }
          if (comp.extends) {
              extendEmits(comp.extends);
          }
          if (comp.mixins) {
              comp.mixins.forEach(extendEmits);
          }
      }
      if (!raw && !hasExtends) {
          return (comp.__emits = null);
      }
      if (isArray(raw)) {
          raw.forEach(key => (normalized[key] = null));
      }
      else {
          extend(normalized, raw);
      }
      return (comp.__emits = normalized);
  }
  // Check if an incoming prop key is a declared emit event listener.
  // e.g. With `emits: { click: null }`, props named `onClick` and `onclick` are
  // both considered matched listeners.
  function isEmitListener(options, key) {
      if (!options || !isOn(key)) {
          return false;
      }
      key = key.slice(2).replace(/Once$/, '');
      return (hasOwn(options, key[0].toLowerCase() + key.slice(1)) ||
          hasOwn(options, hyphenate(key)) ||
          hasOwn(options, key));
  }

  let isRenderingCompiledSlot = 0;
  const setCompiledSlotRendering = (n) => (isRenderingCompiledSlot += n);
  /**
   * Compiler runtime helper for rendering `<slot/>`
   * @private
   */
  function renderSlot(slots, name, props = {}, 
  // this is not a user-facing function, so the fallback is always generated by
  // the compiler and guaranteed to be a function returning an array
  fallback, noSlotted) {
      let slot = slots[name];
      if (slot && slot.length > 1) {
          warn(`SSR-optimized slot function detected in a non-SSR-optimized render ` +
              `function. You need to mark this component with $dynamic-slots in the ` +
              `parent template.`);
          slot = () => [];
      }
      // a compiled slot disables block tracking by default to avoid manual
      // invocation interfering with template-based block tracking, but in
      // `renderSlot` we can be sure that it's template-based so we can force
      // enable it.
      isRenderingCompiledSlot++;
      openBlock();
      const validSlotContent = slot && ensureValidVNode(slot(props));
      const rendered = createBlock(Fragment, { key: props.key || `_${name}` }, validSlotContent || (fallback ? fallback() : []), validSlotContent && slots._ === 1 /* STABLE */
          ? 64 /* STABLE_FRAGMENT */
          : -2 /* BAIL */);
      if (!noSlotted && rendered.scopeId) {
          rendered.slotScopeIds = [rendered.scopeId + '-s'];
      }
      isRenderingCompiledSlot--;
      return rendered;
  }
  function ensureValidVNode(vnodes) {
      return vnodes.some(child => {
          if (!isVNode(child))
              return true;
          if (child.type === Comment)
              return false;
          if (child.type === Fragment &&
              !ensureValidVNode(child.children))
              return false;
          return true;
      })
          ? vnodes
          : null;
  }

  /**
   * mark the current rendering instance for asset resolution (e.g.
   * resolveComponent, resolveDirective) during render
   */
  let currentRenderingInstance = null;
  let currentScopeId = null;
  /**
   * Note: rendering calls maybe nested. The function returns the parent rendering
   * instance if present, which should be restored after the render is done:
   *
   * ```js
   * const prev = setCurrentRenderingInstance(i)
   * // ...render
   * setCurrentRenderingInstance(prev)
   * ```
   */
  function setCurrentRenderingInstance(instance) {
      const prev = currentRenderingInstance;
      currentRenderingInstance = instance;
      currentScopeId = (instance && instance.type.__scopeId) || null;
      return prev;
  }
  /**
   * Set scope id when creating hoisted vnodes.
   * @private compiler helper
   */
  function pushScopeId(id) {
      currentScopeId = id;
  }
  /**
   * Technically we no longer need this after 3.0.8 but we need to keep the same
   * API for backwards compat w/ code generated by compilers.
   * @private
   */
  function popScopeId() {
      currentScopeId = null;
  }
  /**
   * Only for backwards compat
   * @private
   */
  const withScopeId = (_id) => withCtx;
  /**
   * Wrap a slot function to memoize current rendering instance
   * @private compiler helper
   */
  function withCtx(fn, ctx = currentRenderingInstance) {
      if (!ctx)
          return fn;
      const renderFnWithContext = (...args) => {
          // If a user calls a compiled slot inside a template expression (#1745), it
          // can mess up block tracking, so by default we need to push a null block to
          // avoid that. This isn't necessary if rendering a compiled `<slot>`.
          if (!isRenderingCompiledSlot) {
              openBlock(true /* null block that disables tracking */);
          }
          const prevInstance = setCurrentRenderingInstance(ctx);
          const res = fn(...args);
          setCurrentRenderingInstance(prevInstance);
          if (!isRenderingCompiledSlot) {
              closeBlock();
          }
          return res;
      };
      // mark this as a compiled slot function.
      // this is used in vnode.ts -> normalizeChildren() to set the slot
      // rendering flag.
      renderFnWithContext._c = true;
      return renderFnWithContext;
  }

  /**
   * dev only flag to track whether $attrs was used during render.
   * If $attrs was used during render then the warning for failed attrs
   * fallthrough can be suppressed.
   */
  let accessedAttrs = false;
  function markAttrsAccessed() {
      accessedAttrs = true;
  }
  function renderComponentRoot(instance) {
      const { type: Component, vnode, proxy, withProxy, props, propsOptions: [propsOptions], slots, attrs, emit, render, renderCache, data, setupState, ctx } = instance;
      let result;
      const prev = setCurrentRenderingInstance(instance);
      {
          accessedAttrs = false;
      }
      try {
          let fallthroughAttrs;
          if (vnode.shapeFlag & 4 /* STATEFUL_COMPONENT */) {
              // withProxy is a proxy with a different `has` trap only for
              // runtime-compiled render functions using `with` block.
              const proxyToUse = withProxy || proxy;
              result = normalizeVNode(render.call(proxyToUse, proxyToUse, renderCache, props, setupState, data, ctx));
              fallthroughAttrs = attrs;
          }
          else {
              // functional
              const render = Component;
              // in dev, mark attrs accessed if optional props (attrs === props)
              if (true && attrs === props) {
                  markAttrsAccessed();
              }
              result = normalizeVNode(render.length > 1
                  ? render(props, true
                      ? {
                          get attrs() {
                              markAttrsAccessed();
                              return attrs;
                          },
                          slots,
                          emit
                      }
                      : { attrs, slots, emit })
                  : render(props, null /* we know it doesn't need it */));
              fallthroughAttrs = Component.props
                  ? attrs
                  : getFunctionalFallthrough(attrs);
          }
          // attr merging
          // in dev mode, comments are preserved, and it's possible for a template
          // to have comments along side the root element which makes it a fragment
          let root = result;
          let setRoot = undefined;
          if (true &&
              result.patchFlag > 0 &&
              result.patchFlag & 2048 /* DEV_ROOT_FRAGMENT */) {
              ;
              [root, setRoot] = getChildRoot(result);
          }
          if (Component.inheritAttrs !== false && fallthroughAttrs) {
              const keys = Object.keys(fallthroughAttrs);
              const { shapeFlag } = root;
              if (keys.length) {
                  if (shapeFlag & 1 /* ELEMENT */ ||
                      shapeFlag & 6 /* COMPONENT */) {
                      if (propsOptions && keys.some(isModelListener)) {
                          // If a v-model listener (onUpdate:xxx) has a corresponding declared
                          // prop, it indicates this component expects to handle v-model and
                          // it should not fallthrough.
                          // related: #1543, #1643, #1989
                          fallthroughAttrs = filterModelListeners(fallthroughAttrs, propsOptions);
                      }
                      root = cloneVNode(root, fallthroughAttrs);
                  }
                  else if (true && !accessedAttrs && root.type !== Comment) {
                      const allAttrs = Object.keys(attrs);
                      const eventAttrs = [];
                      const extraAttrs = [];
                      for (let i = 0, l = allAttrs.length; i < l; i++) {
                          const key = allAttrs[i];
                          if (isOn(key)) {
                              // ignore v-model handlers when they fail to fallthrough
                              if (!isModelListener(key)) {
                                  // remove `on`, lowercase first letter to reflect event casing
                                  // accurately
                                  eventAttrs.push(key[2].toLowerCase() + key.slice(3));
                              }
                          }
                          else {
                              extraAttrs.push(key);
                          }
                      }
                      if (extraAttrs.length) {
                          warn(`Extraneous non-props attributes (` +
                              `${extraAttrs.join(', ')}) ` +
                              `were passed to component but could not be automatically inherited ` +
                              `because component renders fragment or text root nodes.`);
                      }
                      if (eventAttrs.length) {
                          warn(`Extraneous non-emits event listeners (` +
                              `${eventAttrs.join(', ')}) ` +
                              `were passed to component but could not be automatically inherited ` +
                              `because component renders fragment or text root nodes. ` +
                              `If the listener is intended to be a component custom event listener only, ` +
                              `declare it using the "emits" option.`);
                      }
                  }
              }
          }
          // inherit directives
          if (vnode.dirs) {
              if (true && !isElementRoot(root)) {
                  warn(`Runtime directive used on component with non-element root node. ` +
                      `The directives will not function as intended.`);
              }
              root.dirs = root.dirs ? root.dirs.concat(vnode.dirs) : vnode.dirs;
          }
          // inherit transition data
          if (vnode.transition) {
              if (true && !isElementRoot(root)) {
                  warn(`Component inside <Transition> renders non-element root node ` +
                      `that cannot be animated.`);
              }
              root.transition = vnode.transition;
          }
          if (true && setRoot) {
              setRoot(root);
          }
          else {
              result = root;
          }
      }
      catch (err) {
          blockStack.length = 0;
          handleError(err, instance, 1 /* RENDER_FUNCTION */);
          result = createVNode(Comment);
      }
      setCurrentRenderingInstance(prev);
      return result;
  }
  /**
   * dev only
   * In dev mode, template root level comments are rendered, which turns the
   * template into a fragment root, but we need to locate the single element
   * root for attrs and scope id processing.
   */
  const getChildRoot = (vnode) => {
      const rawChildren = vnode.children;
      const dynamicChildren = vnode.dynamicChildren;
      const childRoot = filterSingleRoot(rawChildren);
      if (!childRoot) {
          return [vnode, undefined];
      }
      const index = rawChildren.indexOf(childRoot);
      const dynamicIndex = dynamicChildren ? dynamicChildren.indexOf(childRoot) : -1;
      const setRoot = (updatedRoot) => {
          rawChildren[index] = updatedRoot;
          if (dynamicChildren) {
              if (dynamicIndex > -1) {
                  dynamicChildren[dynamicIndex] = updatedRoot;
              }
              else if (updatedRoot.patchFlag > 0) {
                  vnode.dynamicChildren = [...dynamicChildren, updatedRoot];
              }
          }
      };
      return [normalizeVNode(childRoot), setRoot];
  };
  function filterSingleRoot(children) {
      let singleRoot;
      for (let i = 0; i < children.length; i++) {
          const child = children[i];
          if (isVNode(child)) {
              // ignore user comment
              if (child.type !== Comment || child.children === 'v-if') {
                  if (singleRoot) {
                      // has more than 1 non-comment child, return now
                      return;
                  }
                  else {
                      singleRoot = child;
                  }
              }
          }
          else {
              return;
          }
      }
      return singleRoot;
  }
  const getFunctionalFallthrough = (attrs) => {
      let res;
      for (const key in attrs) {
          if (key === 'class' || key === 'style' || isOn(key)) {
              (res || (res = {}))[key] = attrs[key];
          }
      }
      return res;
  };
  const filterModelListeners = (attrs, props) => {
      const res = {};
      for (const key in attrs) {
          if (!isModelListener(key) || !(key.slice(9) in props)) {
              res[key] = attrs[key];
          }
      }
      return res;
  };
  const isElementRoot = (vnode) => {
      return (vnode.shapeFlag & 6 /* COMPONENT */ ||
          vnode.shapeFlag & 1 /* ELEMENT */ ||
          vnode.type === Comment // potential v-if branch switch
      );
  };
  function shouldUpdateComponent(prevVNode, nextVNode, optimized) {
      const { props: prevProps, children: prevChildren, component } = prevVNode;
      const { props: nextProps, children: nextChildren, patchFlag } = nextVNode;
      const emits = component.emitsOptions;
      // Parent component's render function was hot-updated. Since this may have
      // caused the child component's slots content to have changed, we need to
      // force the child to update as well.
      if ((prevChildren || nextChildren) && isHmrUpdating) {
          return true;
      }
      // force child update for runtime directive or transition on component vnode.
      if (nextVNode.dirs || nextVNode.transition) {
          return true;
      }
      if (optimized && patchFlag >= 0) {
          if (patchFlag & 1024 /* DYNAMIC_SLOTS */) {
              // slot content that references values that might have changed,
              // e.g. in a v-for
              return true;
          }
          if (patchFlag & 16 /* FULL_PROPS */) {
              if (!prevProps) {
                  return !!nextProps;
              }
              // presence of this flag indicates props are always non-null
              return hasPropsChanged(prevProps, nextProps, emits);
          }
          else if (patchFlag & 8 /* PROPS */) {
              const dynamicProps = nextVNode.dynamicProps;
              for (let i = 0; i < dynamicProps.length; i++) {
                  const key = dynamicProps[i];
                  if (nextProps[key] !== prevProps[key] &&
                      !isEmitListener(emits, key)) {
                      return true;
                  }
              }
          }
      }
      else {
          // this path is only taken by manually written render functions
          // so presence of any children leads to a forced update
          if (prevChildren || nextChildren) {
              if (!nextChildren || !nextChildren.$stable) {
                  return true;
              }
          }
          if (prevProps === nextProps) {
              return false;
          }
          if (!prevProps) {
              return !!nextProps;
          }
          if (!nextProps) {
              return true;
          }
          return hasPropsChanged(prevProps, nextProps, emits);
      }
      return false;
  }
  function hasPropsChanged(prevProps, nextProps, emitsOptions) {
      const nextKeys = Object.keys(nextProps);
      if (nextKeys.length !== Object.keys(prevProps).length) {
          return true;
      }
      for (let i = 0; i < nextKeys.length; i++) {
          const key = nextKeys[i];
          if (nextProps[key] !== prevProps[key] &&
              !isEmitListener(emitsOptions, key)) {
              return true;
          }
      }
      return false;
  }
  function updateHOCHostEl({ vnode, parent }, el // HostNode
  ) {
      while (parent && parent.subTree === vnode) {
          (vnode = parent.vnode).el = el;
          parent = parent.parent;
      }
  }

  const isSuspense = (type) => type.__isSuspense;
  // Suspense exposes a component-like API, and is treated like a component
  // in the compiler, but internally it's a special built-in type that hooks
  // directly into the renderer.
  const SuspenseImpl = {
      name: 'Suspense',
      // In order to make Suspense tree-shakable, we need to avoid importing it
      // directly in the renderer. The renderer checks for the __isSuspense flag
      // on a vnode's type and calls the `process` method, passing in renderer
      // internals.
      __isSuspense: true,
      process(n1, n2, container, anchor, parentComponent, parentSuspense, isSVG, slotScopeIds, optimized, 
      // platform-specific impl passed from renderer
      rendererInternals) {
          if (n1 == null) {
              mountSuspense(n2, container, anchor, parentComponent, parentSuspense, isSVG, slotScopeIds, optimized, rendererInternals);
          }
          else {
              patchSuspense(n1, n2, container, anchor, parentComponent, isSVG, slotScopeIds, optimized, rendererInternals);
          }
      },
      hydrate: hydrateSuspense,
      create: createSuspenseBoundary
  };
  // Force-casted public typing for h and TSX props inference
  const Suspense = (SuspenseImpl
      );
  function mountSuspense(vnode, container, anchor, parentComponent, parentSuspense, isSVG, slotScopeIds, optimized, rendererInternals) {
      const { p: patch, o: { createElement } } = rendererInternals;
      const hiddenContainer = createElement('div');
      const suspense = (vnode.suspense = createSuspenseBoundary(vnode, parentSuspense, parentComponent, container, hiddenContainer, anchor, isSVG, slotScopeIds, optimized, rendererInternals));
      // start mounting the content subtree in an off-dom container
      patch(null, (suspense.pendingBranch = vnode.ssContent), hiddenContainer, null, parentComponent, suspense, isSVG, slotScopeIds);
      // now check if we have encountered any async deps
      if (suspense.deps > 0) {
          // has async
          // mount the fallback tree
          patch(null, vnode.ssFallback, container, anchor, parentComponent, null, // fallback tree will not have suspense context
          isSVG, slotScopeIds);
          setActiveBranch(suspense, vnode.ssFallback);
      }
      else {
          // Suspense has no async deps. Just resolve.
          suspense.resolve();
      }
  }
  function patchSuspense(n1, n2, container, anchor, parentComponent, isSVG, slotScopeIds, optimized, { p: patch, um: unmount, o: { createElement } }) {
      const suspense = (n2.suspense = n1.suspense);
      suspense.vnode = n2;
      n2.el = n1.el;
      const newBranch = n2.ssContent;
      const newFallback = n2.ssFallback;
      const { activeBranch, pendingBranch, isInFallback, isHydrating } = suspense;
      if (pendingBranch) {
          suspense.pendingBranch = newBranch;
          if (isSameVNodeType(newBranch, pendingBranch)) {
              // same root type but content may have changed.
              patch(pendingBranch, newBranch, suspense.hiddenContainer, null, parentComponent, suspense, isSVG, slotScopeIds, optimized);
              if (suspense.deps <= 0) {
                  suspense.resolve();
              }
              else if (isInFallback) {
                  patch(activeBranch, newFallback, container, anchor, parentComponent, null, // fallback tree will not have suspense context
                  isSVG, slotScopeIds, optimized);
                  setActiveBranch(suspense, newFallback);
              }
          }
          else {
              // toggled before pending tree is resolved
              suspense.pendingId++;
              if (isHydrating) {
                  // if toggled before hydration is finished, the current DOM tree is
                  // no longer valid. set it as the active branch so it will be unmounted
                  // when resolved
                  suspense.isHydrating = false;
                  suspense.activeBranch = pendingBranch;
              }
              else {
                  unmount(pendingBranch, parentComponent, suspense);
              }
              // increment pending ID. this is used to invalidate async callbacks
              // reset suspense state
              suspense.deps = 0;
              // discard effects from pending branch
              suspense.effects.length = 0;
              // discard previous container
              suspense.hiddenContainer = createElement('div');
              if (isInFallback) {
                  // already in fallback state
                  patch(null, newBranch, suspense.hiddenContainer, null, parentComponent, suspense, isSVG, slotScopeIds, optimized);
                  if (suspense.deps <= 0) {
                      suspense.resolve();
                  }
                  else {
                      patch(activeBranch, newFallback, container, anchor, parentComponent, null, // fallback tree will not have suspense context
                      isSVG, slotScopeIds, optimized);
                      setActiveBranch(suspense, newFallback);
                  }
              }
              else if (activeBranch && isSameVNodeType(newBranch, activeBranch)) {
                  // toggled "back" to current active branch
                  patch(activeBranch, newBranch, container, anchor, parentComponent, suspense, isSVG, slotScopeIds, optimized);
                  // force resolve
                  suspense.resolve(true);
              }
              else {
                  // switched to a 3rd branch
                  patch(null, newBranch, suspense.hiddenContainer, null, parentComponent, suspense, isSVG, slotScopeIds, optimized);
                  if (suspense.deps <= 0) {
                      suspense.resolve();
                  }
              }
          }
      }
      else {
          if (activeBranch && isSameVNodeType(newBranch, activeBranch)) {
              // root did not change, just normal patch
              patch(activeBranch, newBranch, container, anchor, parentComponent, suspense, isSVG, slotScopeIds, optimized);
              setActiveBranch(suspense, newBranch);
          }
          else {
              // root node toggled
              // invoke @pending event
              const onPending = n2.props && n2.props.onPending;
              if (isFunction(onPending)) {
                  onPending();
              }
              // mount pending branch in off-dom container
              suspense.pendingBranch = newBranch;
              suspense.pendingId++;
              patch(null, newBranch, suspense.hiddenContainer, null, parentComponent, suspense, isSVG, slotScopeIds, optimized);
              if (suspense.deps <= 0) {
                  // incoming branch has no async deps, resolve now.
                  suspense.resolve();
              }
              else {
                  const { timeout, pendingId } = suspense;
                  if (timeout > 0) {
                      setTimeout(() => {
                          if (suspense.pendingId === pendingId) {
                              suspense.fallback(newFallback);
                          }
                      }, timeout);
                  }
                  else if (timeout === 0) {
                      suspense.fallback(newFallback);
                  }
              }
          }
      }
  }
  let hasWarned = false;
  function createSuspenseBoundary(vnode, parent, parentComponent, container, hiddenContainer, anchor, isSVG, slotScopeIds, optimized, rendererInternals, isHydrating = false) {
      /* istanbul ignore if */
      if (!hasWarned) {
          hasWarned = true;
          // @ts-ignore `console.info` cannot be null error
          console[console.info ? 'info' : 'log'](`<Suspense> is an experimental feature and its API will likely change.`);
      }
      const { p: patch, m: move, um: unmount, n: next, o: { parentNode, remove } } = rendererInternals;
      const timeout = toNumber(vnode.props && vnode.props.timeout);
      const suspense = {
          vnode,
          parent,
          parentComponent,
          isSVG,
          container,
          hiddenContainer,
          anchor,
          deps: 0,
          pendingId: 0,
          timeout: typeof timeout === 'number' ? timeout : -1,
          activeBranch: null,
          pendingBranch: null,
          isInFallback: true,
          isHydrating,
          isUnmounted: false,
          effects: [],
          resolve(resume = false) {
              {
                  if (!resume && !suspense.pendingBranch) {
                      throw new Error(`suspense.resolve() is called without a pending branch.`);
                  }
                  if (suspense.isUnmounted) {
                      throw new Error(`suspense.resolve() is called on an already unmounted suspense boundary.`);
                  }
              }
              const { vnode, activeBranch, pendingBranch, pendingId, effects, parentComponent, container } = suspense;
              if (suspense.isHydrating) {
                  suspense.isHydrating = false;
              }
              else if (!resume) {
                  const delayEnter = activeBranch &&
                      pendingBranch.transition &&
                      pendingBranch.transition.mode === 'out-in';
                  if (delayEnter) {
                      activeBranch.transition.afterLeave = () => {
                          if (pendingId === suspense.pendingId) {
                              move(pendingBranch, container, anchor, 0 /* ENTER */);
                          }
                      };
                  }
                  // this is initial anchor on mount
                  let { anchor } = suspense;
                  // unmount current active tree
                  if (activeBranch) {
                      // if the fallback tree was mounted, it may have been moved
                      // as part of a parent suspense. get the latest anchor for insertion
                      anchor = next(activeBranch);
                      unmount(activeBranch, parentComponent, suspense, true);
                  }
                  if (!delayEnter) {
                      // move content from off-dom container to actual container
                      move(pendingBranch, container, anchor, 0 /* ENTER */);
                  }
              }
              setActiveBranch(suspense, pendingBranch);
              suspense.pendingBranch = null;
              suspense.isInFallback = false;
              // flush buffered effects
              // check if there is a pending parent suspense
              let parent = suspense.parent;
              let hasUnresolvedAncestor = false;
              while (parent) {
                  if (parent.pendingBranch) {
                      // found a pending parent suspense, merge buffered post jobs
                      // into that parent
                      parent.effects.push(...effects);
                      hasUnresolvedAncestor = true;
                      break;
                  }
                  parent = parent.parent;
              }
              // no pending parent suspense, flush all jobs
              if (!hasUnresolvedAncestor) {
                  queuePostFlushCb(effects);
              }
              suspense.effects = [];
              // invoke @resolve event
              const onResolve = vnode.props && vnode.props.onResolve;
              if (isFunction(onResolve)) {
                  onResolve();
              }
          },
          fallback(fallbackVNode) {
              if (!suspense.pendingBranch) {
                  return;
              }
              const { vnode, activeBranch, parentComponent, container, isSVG } = suspense;
              // invoke @fallback event
              const onFallback = vnode.props && vnode.props.onFallback;
              if (isFunction(onFallback)) {
                  onFallback();
              }
              const anchor = next(activeBranch);
              const mountFallback = () => {
                  if (!suspense.isInFallback) {
                      return;
                  }
                  // mount the fallback tree
                  patch(null, fallbackVNode, container, anchor, parentComponent, null, // fallback tree will not have suspense context
                  isSVG, slotScopeIds, optimized);
                  setActiveBranch(suspense, fallbackVNode);
              };
              const delayEnter = fallbackVNode.transition && fallbackVNode.transition.mode === 'out-in';
              if (delayEnter) {
                  activeBranch.transition.afterLeave = mountFallback;
              }
              // unmount current active branch
              unmount(activeBranch, parentComponent, null, // no suspense so unmount hooks fire now
              true // shouldRemove
              );
              suspense.isInFallback = true;
              if (!delayEnter) {
                  mountFallback();
              }
          },
          move(container, anchor, type) {
              suspense.activeBranch &&
                  move(suspense.activeBranch, container, anchor, type);
              suspense.container = container;
          },
          next() {
              return suspense.activeBranch && next(suspense.activeBranch);
          },
          registerDep(instance, setupRenderEffect) {
              const isInPendingSuspense = !!suspense.pendingBranch;
              if (isInPendingSuspense) {
                  suspense.deps++;
              }
              const hydratedEl = instance.vnode.el;
              instance
                  .asyncDep.catch(err => {
                  handleError(err, instance, 0 /* SETUP_FUNCTION */);
              })
                  .then(asyncSetupResult => {
                  // retry when the setup() promise resolves.
                  // component may have been unmounted before resolve.
                  if (instance.isUnmounted ||
                      suspense.isUnmounted ||
                      suspense.pendingId !== instance.suspenseId) {
                      return;
                  }
                  // retry from this component
                  instance.asyncResolved = true;
                  const { vnode } = instance;
                  {
                      pushWarningContext(vnode);
                  }
                  handleSetupResult(instance, asyncSetupResult, false);
                  if (hydratedEl) {
                      // vnode may have been replaced if an update happened before the
                      // async dep is resolved.
                      vnode.el = hydratedEl;
                  }
                  const placeholder = !hydratedEl && instance.subTree.el;
                  setupRenderEffect(instance, vnode, 
                  // component may have been moved before resolve.
                  // if this is not a hydration, instance.subTree will be the comment
                  // placeholder.
                  parentNode(hydratedEl || instance.subTree.el), 
                  // anchor will not be used if this is hydration, so only need to
                  // consider the comment placeholder case.
                  hydratedEl ? null : next(instance.subTree), suspense, isSVG, optimized);
                  if (placeholder) {
                      remove(placeholder);
                  }
                  updateHOCHostEl(instance, vnode.el);
                  {
                      popWarningContext();
                  }
                  // only decrease deps count if suspense is not already resolved
                  if (isInPendingSuspense && --suspense.deps === 0) {
                      suspense.resolve();
                  }
              });
          },
          unmount(parentSuspense, doRemove) {
              suspense.isUnmounted = true;
              if (suspense.activeBranch) {
                  unmount(suspense.activeBranch, parentComponent, parentSuspense, doRemove);
              }
              if (suspense.pendingBranch) {
                  unmount(suspense.pendingBranch, parentComponent, parentSuspense, doRemove);
              }
          }
      };
      return suspense;
  }
  function hydrateSuspense(node, vnode, parentComponent, parentSuspense, isSVG, slotScopeIds, optimized, rendererInternals, hydrateNode) {
      /* eslint-disable no-restricted-globals */
      const suspense = (vnode.suspense = createSuspenseBoundary(vnode, parentSuspense, parentComponent, node.parentNode, document.createElement('div'), null, isSVG, slotScopeIds, optimized, rendererInternals, true /* hydrating */));
      // there are two possible scenarios for server-rendered suspense:
      // - success: ssr content should be fully resolved
      // - failure: ssr content should be the fallback branch.
      // however, on the client we don't really know if it has failed or not
      // attempt to hydrate the DOM assuming it has succeeded, but we still
      // need to construct a suspense boundary first
      const result = hydrateNode(node, (suspense.pendingBranch = vnode.ssContent), parentComponent, suspense, slotScopeIds, optimized);
      if (suspense.deps === 0) {
          suspense.resolve();
      }
      return result;
      /* eslint-enable no-restricted-globals */
  }
  function normalizeSuspenseChildren(vnode) {
      const { shapeFlag, children } = vnode;
      let content;
      let fallback;
      if (shapeFlag & 32 /* SLOTS_CHILDREN */) {
          content = normalizeSuspenseSlot(children.default);
          fallback = normalizeSuspenseSlot(children.fallback);
      }
      else {
          content = normalizeSuspenseSlot(children);
          fallback = normalizeVNode(null);
      }
      return {
          content,
          fallback
      };
  }
  function normalizeSuspenseSlot(s) {
      if (isFunction(s)) {
          s = s();
      }
      if (isArray(s)) {
          const singleChild = filterSingleRoot(s);
          if (!singleChild) {
              warn(`<Suspense> slots expect a single root node.`);
          }
          s = singleChild;
      }
      return normalizeVNode(s);
  }
  function queueEffectWithSuspense(fn, suspense) {
      if (suspense && suspense.pendingBranch) {
          if (isArray(fn)) {
              suspense.effects.push(...fn);
          }
          else {
              suspense.effects.push(fn);
          }
      }
      else {
          queuePostFlushCb(fn);
      }
  }
  function setActiveBranch(suspense, branch) {
      suspense.activeBranch = branch;
      const { vnode, parentComponent } = suspense;
      const el = (vnode.el = branch.el);
      // in case suspense is the root node of a component,
      // recursively update the HOC el
      if (parentComponent && parentComponent.subTree === vnode) {
          parentComponent.vnode.el = el;
          updateHOCHostEl(parentComponent, el);
      }
  }

  function initProps(instance, rawProps, isStateful, // result of bitwise flag comparison
  isSSR = false) {
      const props = {};
      const attrs = {};
      def(attrs, InternalObjectKey, 1);
      instance.propsDefaults = Object.create(null);
      setFullProps(instance, rawProps, props, attrs);
      // validation
      {
          validateProps(rawProps || {}, props, instance);
      }
      if (isStateful) {
          // stateful
          instance.props = isSSR ? props : shallowReactive(props);
      }
      else {
          if (!instance.type.props) {
              // functional w/ optional props, props === attrs
              instance.props = attrs;
          }
          else {
              // functional w/ declared props
              instance.props = props;
          }
      }
      instance.attrs = attrs;
  }
  function updateProps(instance, rawProps, rawPrevProps, optimized) {
      const { props, attrs, vnode: { patchFlag } } = instance;
      const rawCurrentProps = toRaw(props);
      const [options] = instance.propsOptions;
      if (
      // always force full diff in dev
      // - #1942 if hmr is enabled with sfc component
      // - vite#872 non-sfc component used by sfc component
      !((instance.type.__hmrId ||
              (instance.parent && instance.parent.type.__hmrId))) &&
          (optimized || patchFlag > 0) &&
          !(patchFlag & 16 /* FULL_PROPS */)) {
          if (patchFlag & 8 /* PROPS */) {
              // Compiler-generated props & no keys change, just set the updated
              // the props.
              const propsToUpdate = instance.vnode.dynamicProps;
              for (let i = 0; i < propsToUpdate.length; i++) {
                  const key = propsToUpdate[i];
                  // PROPS flag guarantees rawProps to be non-null
                  const value = rawProps[key];
                  if (options) {
                      // attr / props separation was done on init and will be consistent
                      // in this code path, so just check if attrs have it.
                      if (hasOwn(attrs, key)) {
                          attrs[key] = value;
                      }
                      else {
                          const camelizedKey = camelize(key);
                          props[camelizedKey] = resolvePropValue(options, rawCurrentProps, camelizedKey, value, instance);
                      }
                  }
                  else {
                      attrs[key] = value;
                  }
              }
          }
      }
      else {
          // full props update.
          setFullProps(instance, rawProps, props, attrs);
          // in case of dynamic props, check if we need to delete keys from
          // the props object
          let kebabKey;
          for (const key in rawCurrentProps) {
              if (!rawProps ||
                  // for camelCase
                  (!hasOwn(rawProps, key) &&
                      // it's possible the original props was passed in as kebab-case
                      // and converted to camelCase (#955)
                      ((kebabKey = hyphenate(key)) === key || !hasOwn(rawProps, kebabKey)))) {
                  if (options) {
                      if (rawPrevProps &&
                          // for camelCase
                          (rawPrevProps[key] !== undefined ||
                              // for kebab-case
                              rawPrevProps[kebabKey] !== undefined)) {
                          props[key] = resolvePropValue(options, rawProps || EMPTY_OBJ, key, undefined, instance);
                      }
                  }
                  else {
                      delete props[key];
                  }
              }
          }
          // in the case of functional component w/o props declaration, props and
          // attrs point to the same object so it should already have been updated.
          if (attrs !== rawCurrentProps) {
              for (const key in attrs) {
                  if (!rawProps || !hasOwn(rawProps, key)) {
                      delete attrs[key];
                  }
              }
          }
      }
      // trigger updates for $attrs in case it's used in component slots
      trigger(instance, "set" /* SET */, '$attrs');
      {
          validateProps(rawProps || {}, props, instance);
      }
  }
  function setFullProps(instance, rawProps, props, attrs) {
      const [options, needCastKeys] = instance.propsOptions;
      if (rawProps) {
          for (const key in rawProps) {
              const value = rawProps[key];
              // key, ref are reserved and never passed down
              if (isReservedProp(key)) {
                  continue;
              }
              // prop option names are camelized during normalization, so to support
              // kebab -> camel conversion here we need to camelize the key.
              let camelKey;
              if (options && hasOwn(options, (camelKey = camelize(key)))) {
                  props[camelKey] = value;
              }
              else if (!isEmitListener(instance.emitsOptions, key)) {
                  // Any non-declared (either as a prop or an emitted event) props are put
                  // into a separate `attrs` object for spreading. Make sure to preserve
                  // original key casing
                  attrs[key] = value;
              }
          }
      }
      if (needCastKeys) {
          const rawCurrentProps = toRaw(props);
          for (let i = 0; i < needCastKeys.length; i++) {
              const key = needCastKeys[i];
              props[key] = resolvePropValue(options, rawCurrentProps, key, rawCurrentProps[key], instance);
          }
      }
  }
  function resolvePropValue(options, props, key, value, instance) {
      const opt = options[key];
      if (opt != null) {
          const hasDefault = hasOwn(opt, 'default');
          // default values
          if (hasDefault && value === undefined) {
              const defaultValue = opt.default;
              if (opt.type !== Function && isFunction(defaultValue)) {
                  const { propsDefaults } = instance;
                  if (key in propsDefaults) {
                      value = propsDefaults[key];
                  }
                  else {
                      setCurrentInstance(instance);
                      value = propsDefaults[key] = defaultValue(props);
                      setCurrentInstance(null);
                  }
              }
              else {
                  value = defaultValue;
              }
          }
          // boolean casting
          if (opt[0 /* shouldCast */]) {
              if (!hasOwn(props, key) && !hasDefault) {
                  value = false;
              }
              else if (opt[1 /* shouldCastTrue */] &&
                  (value === '' || value === hyphenate(key))) {
                  value = true;
              }
          }
      }
      return value;
  }
  function normalizePropsOptions(comp, appContext, asMixin = false) {
      if (!appContext.deopt && comp.__props) {
          return comp.__props;
      }
      const raw = comp.props;
      const normalized = {};
      const needCastKeys = [];
      // apply mixin/extends props
      let hasExtends = false;
      if (!isFunction(comp)) {
          const extendProps = (raw) => {
              hasExtends = true;
              const [props, keys] = normalizePropsOptions(raw, appContext, true);
              extend(normalized, props);
              if (keys)
                  needCastKeys.push(...keys);
          };
          if (!asMixin && appContext.mixins.length) {
              appContext.mixins.forEach(extendProps);
          }
          if (comp.extends) {
              extendProps(comp.extends);
          }
          if (comp.mixins) {
              comp.mixins.forEach(extendProps);
          }
      }
      if (!raw && !hasExtends) {
          return (comp.__props = EMPTY_ARR);
      }
      if (isArray(raw)) {
          for (let i = 0; i < raw.length; i++) {
              if (!isString(raw[i])) {
                  warn(`props must be strings when using array syntax.`, raw[i]);
              }
              const normalizedKey = camelize(raw[i]);
              if (validatePropName(normalizedKey)) {
                  normalized[normalizedKey] = EMPTY_OBJ;
              }
          }
      }
      else if (raw) {
          if (!isObject(raw)) {
              warn(`invalid props options`, raw);
          }
          for (const key in raw) {
              const normalizedKey = camelize(key);
              if (validatePropName(normalizedKey)) {
                  const opt = raw[key];
                  const prop = (normalized[normalizedKey] =
                      isArray(opt) || isFunction(opt) ? { type: opt } : opt);
                  if (prop) {
                      const booleanIndex = getTypeIndex(Boolean, prop.type);
                      const stringIndex = getTypeIndex(String, prop.type);
                      prop[0 /* shouldCast */] = booleanIndex > -1;
                      prop[1 /* shouldCastTrue */] =
                          stringIndex < 0 || booleanIndex < stringIndex;
                      // if the prop needs boolean casting or default value
                      if (booleanIndex > -1 || hasOwn(prop, 'default')) {
                          needCastKeys.push(normalizedKey);
                      }
                  }
              }
          }
      }
      return (comp.__props = [normalized, needCastKeys]);
  }
  function validatePropName(key) {
      if (key[0] !== '$') {
          return true;
      }
      else {
          warn(`Invalid prop name: "${key}" is a reserved property.`);
      }
      return false;
  }
  // use function string name to check type constructors
  // so that it works across vms / iframes.
  function getType(ctor) {
      const match = ctor && ctor.toString().match(/^\s*function (\w+)/);
      return match ? match[1] : '';
  }
  function isSameType(a, b) {
      return getType(a) === getType(b);
  }
  function getTypeIndex(type, expectedTypes) {
      if (isArray(expectedTypes)) {
          return expectedTypes.findIndex(t => isSameType(t, type));
      }
      else if (isFunction(expectedTypes)) {
          return isSameType(expectedTypes, type) ? 0 : -1;
      }
      return -1;
  }
  /**
   * dev only
   */
  function validateProps(rawProps, props, instance) {
      const resolvedValues = toRaw(props);
      const options = instance.propsOptions[0];
      for (const key in options) {
          let opt = options[key];
          if (opt == null)
              continue;
          validateProp(key, resolvedValues[key], opt, !hasOwn(rawProps, key) && !hasOwn(rawProps, hyphenate(key)));
      }
  }
  /**
   * dev only
   */
  function validateProp(name, value, prop, isAbsent) {
      const { type, required, validator } = prop;
      // required!
      if (required && isAbsent) {
          warn('Missing required prop: "' + name + '"');
          return;
      }
      // missing but optional
      if (value == null && !prop.required) {
          return;
      }
      // type check
      if (type != null && type !== true) {
          let isValid = false;
          const types = isArray(type) ? type : [type];
          const expectedTypes = [];
          // value is valid as long as one of the specified types match
          for (let i = 0; i < types.length && !isValid; i++) {
              const { valid, expectedType } = assertType(value, types[i]);
              expectedTypes.push(expectedType || '');
              isValid = valid;
          }
          if (!isValid) {
              warn(getInvalidTypeMessage(name, value, expectedTypes));
              return;
          }
      }
      // custom validator
      if (validator && !validator(value)) {
          warn('Invalid prop: custom validator check failed for prop "' + name + '".');
      }
  }
  const isSimpleType = /*#__PURE__*/ makeMap('String,Number,Boolean,Function,Symbol,BigInt');
  /**
   * dev only
   */
  function assertType(value, type) {
      let valid;
      const expectedType = getType(type);
      if (isSimpleType(expectedType)) {
          const t = typeof value;
          valid = t === expectedType.toLowerCase();
          // for primitive wrapper objects
          if (!valid && t === 'object') {
              valid = value instanceof type;
          }
      }
      else if (expectedType === 'Object') {
          valid = isObject(value);
      }
      else if (expectedType === 'Array') {
          valid = isArray(value);
      }
      else {
          valid = value instanceof type;
      }
      return {
          valid,
          expectedType
      };
  }
  /**
   * dev only
   */
  function getInvalidTypeMessage(name, value, expectedTypes) {
      let message = `Invalid prop: type check failed for prop "${name}".` +
          ` Expected ${expectedTypes.map(capitalize).join(', ')}`;
      const expectedType = expectedTypes[0];
      const receivedType = toRawType(value);
      const expectedValue = styleValue(value, expectedType);
      const receivedValue = styleValue(value, receivedType);
      // check if we need to specify expected value
      if (expectedTypes.length === 1 &&
          isExplicable(expectedType) &&
          !isBoolean(expectedType, receivedType)) {
          message += ` with value ${expectedValue}`;
      }
      message += `, got ${receivedType} `;
      // check if we need to specify received value
      if (isExplicable(receivedType)) {
          message += `with value ${receivedValue}.`;
      }
      return message;
  }
  /**
   * dev only
   */
  function styleValue(value, type) {
      if (type === 'String') {
          return `"${value}"`;
      }
      else if (type === 'Number') {
          return `${Number(value)}`;
      }
      else {
          return `${value}`;
      }
  }
  /**
   * dev only
   */
  function isExplicable(type) {
      const explicitTypes = ['string', 'number', 'boolean'];
      return explicitTypes.some(elem => type.toLowerCase() === elem);
  }
  /**
   * dev only
   */
  function isBoolean(...args) {
      return args.some(elem => elem.toLowerCase() === 'boolean');
  }

  function injectHook(type, hook, target = currentInstance, prepend = false) {
      if (target) {
          const hooks = target[type] || (target[type] = []);
          // cache the error handling wrapper for injected hooks so the same hook
          // can be properly deduped by the scheduler. "__weh" stands for "with error
          // handling".
          const wrappedHook = hook.__weh ||
              (hook.__weh = (...args) => {
                  if (target.isUnmounted) {
                      return;
                  }
                  // disable tracking inside all lifecycle hooks
                  // since they can potentially be called inside effects.
                  pauseTracking();
                  // Set currentInstance during hook invocation.
                  // This assumes the hook does not synchronously trigger other hooks, which
                  // can only be false when the user does something really funky.
                  setCurrentInstance(target);
                  const res = callWithAsyncErrorHandling(hook, target, type, args);
                  setCurrentInstance(null);
                  resetTracking();
                  return res;
              });
          if (prepend) {
              hooks.unshift(wrappedHook);
          }
          else {
              hooks.push(wrappedHook);
          }
          return wrappedHook;
      }
      else {
          const apiName = toHandlerKey(ErrorTypeStrings[type].replace(/ hook$/, ''));
          warn(`${apiName} is called when there is no active component instance to be ` +
              `associated with. ` +
              `Lifecycle injection APIs can only be used during execution of setup().` +
              (` If you are using async setup(), make sure to register lifecycle ` +
                      `hooks before the first await statement.`
                  ));
      }
  }
  const createHook = (lifecycle) => (hook, target = currentInstance) => 
  // post-create lifecycle registrations are noops during SSR
  !isInSSRComponentSetup && injectHook(lifecycle, hook, target);
  const onBeforeMount = createHook("bm" /* BEFORE_MOUNT */);
  const onMounted = createHook("m" /* MOUNTED */);
  const onBeforeUpdate = createHook("bu" /* BEFORE_UPDATE */);
  const onUpdated = createHook("u" /* UPDATED */);
  const onBeforeUnmount = createHook("bum" /* BEFORE_UNMOUNT */);
  const onUnmounted = createHook("um" /* UNMOUNTED */);
  const onRenderTriggered = createHook("rtg" /* RENDER_TRIGGERED */);
  const onRenderTracked = createHook("rtc" /* RENDER_TRACKED */);
  const onErrorCaptured = (hook, target = currentInstance) => {
      injectHook("ec" /* ERROR_CAPTURED */, hook, target);
  };

  // Simple effect.
  function watchEffect(effect, options) {
      return doWatch(effect, null, options);
  }
  // initial value for watchers to trigger on undefined initial values
  const INITIAL_WATCHER_VALUE = {};
  // implementation
  function watch(source, cb, options) {
      if (!isFunction(cb)) {
          warn(`\`watch(fn, options?)\` signature has been moved to a separate API. ` +
              `Use \`watchEffect(fn, options?)\` instead. \`watch\` now only ` +
              `supports \`watch(source, cb, options?) signature.`);
      }
      return doWatch(source, cb, options);
  }
  function doWatch(source, cb, { immediate, deep, flush, onTrack, onTrigger } = EMPTY_OBJ, instance = currentInstance) {
      if (!cb) {
          if (immediate !== undefined) {
              warn(`watch() "immediate" option is only respected when using the ` +
                  `watch(source, callback, options?) signature.`);
          }
          if (deep !== undefined) {
              warn(`watch() "deep" option is only respected when using the ` +
                  `watch(source, callback, options?) signature.`);
          }
      }
      const warnInvalidSource = (s) => {
          warn(`Invalid watch source: `, s, `A watch source can only be a getter/effect function, a ref, ` +
              `a reactive object, or an array of these types.`);
      };
      let getter;
      let forceTrigger = false;
      if (isRef(source)) {
          getter = () => source.value;
          forceTrigger = !!source._shallow;
      }
      else if (isReactive(source)) {
          getter = () => source;
          deep = true;
      }
      else if (isArray(source)) {
          getter = () => source.map(s => {
              if (isRef(s)) {
                  return s.value;
              }
              else if (isReactive(s)) {
                  return traverse(s);
              }
              else if (isFunction(s)) {
                  return callWithErrorHandling(s, instance, 2 /* WATCH_GETTER */, [
                      instance && instance.proxy
                  ]);
              }
              else {
                  warnInvalidSource(s);
              }
          });
      }
      else if (isFunction(source)) {
          if (cb) {
              // getter with cb
              getter = () => callWithErrorHandling(source, instance, 2 /* WATCH_GETTER */, [
                  instance && instance.proxy
              ]);
          }
          else {
              // no cb -> simple effect
              getter = () => {
                  if (instance && instance.isUnmounted) {
                      return;
                  }
                  if (cleanup) {
                      cleanup();
                  }
                  return callWithAsyncErrorHandling(source, instance, 3 /* WATCH_CALLBACK */, [onInvalidate]);
              };
          }
      }
      else {
          getter = NOOP;
          warnInvalidSource(source);
      }
      if (cb && deep) {
          const baseGetter = getter;
          getter = () => traverse(baseGetter());
      }
      let cleanup;
      let onInvalidate = (fn) => {
          cleanup = runner.options.onStop = () => {
              callWithErrorHandling(fn, instance, 4 /* WATCH_CLEANUP */);
          };
      };
      let oldValue = isArray(source) ? [] : INITIAL_WATCHER_VALUE;
      const job = () => {
          if (!runner.active) {
              return;
          }
          if (cb) {
              // watch(source, cb)
              const newValue = runner();
              if (deep || forceTrigger || hasChanged(newValue, oldValue)) {
                  // cleanup before running cb again
                  if (cleanup) {
                      cleanup();
                  }
                  callWithAsyncErrorHandling(cb, instance, 3 /* WATCH_CALLBACK */, [
                      newValue,
                      // pass undefined as the old value when it's changed for the first time
                      oldValue === INITIAL_WATCHER_VALUE ? undefined : oldValue,
                      onInvalidate
                  ]);
                  oldValue = newValue;
              }
          }
          else {
              // watchEffect
              runner();
          }
      };
      // important: mark the job as a watcher callback so that scheduler knows
      // it is allowed to self-trigger (#1727)
      job.allowRecurse = !!cb;
      let scheduler;
      if (flush === 'sync') {
          scheduler = job;
      }
      else if (flush === 'post') {
          scheduler = () => queuePostRenderEffect(job, instance && instance.suspense);
      }
      else {
          // default: 'pre'
          scheduler = () => {
              if (!instance || instance.isMounted) {
                  queuePreFlushCb(job);
              }
              else {
                  // with 'pre' option, the first call must happen before
                  // the component is mounted so it is called synchronously.
                  job();
              }
          };
      }
      const runner = effect(getter, {
          lazy: true,
          onTrack,
          onTrigger,
          scheduler
      });
      recordInstanceBoundEffect(runner, instance);
      // initial run
      if (cb) {
          if (immediate) {
              job();
          }
          else {
              oldValue = runner();
          }
      }
      else if (flush === 'post') {
          queuePostRenderEffect(runner, instance && instance.suspense);
      }
      else {
          runner();
      }
      return () => {
          stop(runner);
          if (instance) {
              remove(instance.effects, runner);
          }
      };
  }
  // this.$watch
  function instanceWatch(source, cb, options) {
      const publicThis = this.proxy;
      const getter = isString(source)
          ? () => publicThis[source]
          : source.bind(publicThis);
      return doWatch(getter, cb.bind(publicThis), options, this);
  }
  function traverse(value, seen = new Set()) {
      if (!isObject(value) || seen.has(value)) {
          return value;
      }
      seen.add(value);
      if (isRef(value)) {
          traverse(value.value, seen);
      }
      else if (isArray(value)) {
          for (let i = 0; i < value.length; i++) {
              traverse(value[i], seen);
          }
      }
      else if (isSet(value) || isMap(value)) {
          value.forEach((v) => {
              traverse(v, seen);
          });
      }
      else {
          for (const key in value) {
              traverse(value[key], seen);
          }
      }
      return value;
  }

  function useTransitionState() {
      const state = {
          isMounted: false,
          isLeaving: false,
          isUnmounting: false,
          leavingVNodes: new Map()
      };
      onMounted(() => {
          state.isMounted = true;
      });
      onBeforeUnmount(() => {
          state.isUnmounting = true;
      });
      return state;
  }
  const TransitionHookValidator = [Function, Array];
  const BaseTransitionImpl = {
      name: `BaseTransition`,
      props: {
          mode: String,
          appear: Boolean,
          persisted: Boolean,
          // enter
          onBeforeEnter: TransitionHookValidator,
          onEnter: TransitionHookValidator,
          onAfterEnter: TransitionHookValidator,
          onEnterCancelled: TransitionHookValidator,
          // leave
          onBeforeLeave: TransitionHookValidator,
          onLeave: TransitionHookValidator,
          onAfterLeave: TransitionHookValidator,
          onLeaveCancelled: TransitionHookValidator,
          // appear
          onBeforeAppear: TransitionHookValidator,
          onAppear: TransitionHookValidator,
          onAfterAppear: TransitionHookValidator,
          onAppearCancelled: TransitionHookValidator
      },
      setup(props, { slots }) {
          const instance = getCurrentInstance();
          const state = useTransitionState();
          let prevTransitionKey;
          return () => {
              const children = slots.default && getTransitionRawChildren(slots.default(), true);
              if (!children || !children.length) {
                  return;
              }
              // warn multiple elements
              if (children.length > 1) {
                  warn('<transition> can only be used on a single element or component. Use ' +
                      '<transition-group> for lists.');
              }
              // there's no need to track reactivity for these props so use the raw
              // props for a bit better perf
              const rawProps = toRaw(props);
              const { mode } = rawProps;
              // check mode
              if (mode && !['in-out', 'out-in', 'default'].includes(mode)) {
                  warn(`invalid <transition> mode: ${mode}`);
              }
              // at this point children has a guaranteed length of 1.
              const child = children[0];
              if (state.isLeaving) {
                  return emptyPlaceholder(child);
              }
              // in the case of <transition><keep-alive/></transition>, we need to
              // compare the type of the kept-alive children.
              const innerChild = getKeepAliveChild(child);
              if (!innerChild) {
                  return emptyPlaceholder(child);
              }
              const enterHooks = resolveTransitionHooks(innerChild, rawProps, state, instance);
              setTransitionHooks(innerChild, enterHooks);
              const oldChild = instance.subTree;
              const oldInnerChild = oldChild && getKeepAliveChild(oldChild);
              let transitionKeyChanged = false;
              const { getTransitionKey } = innerChild.type;
              if (getTransitionKey) {
                  const key = getTransitionKey();
                  if (prevTransitionKey === undefined) {
                      prevTransitionKey = key;
                  }
                  else if (key !== prevTransitionKey) {
                      prevTransitionKey = key;
                      transitionKeyChanged = true;
                  }
              }
              // handle mode
              if (oldInnerChild &&
                  oldInnerChild.type !== Comment &&
                  (!isSameVNodeType(innerChild, oldInnerChild) || transitionKeyChanged)) {
                  const leavingHooks = resolveTransitionHooks(oldInnerChild, rawProps, state, instance);
                  // update old tree's hooks in case of dynamic transition
                  setTransitionHooks(oldInnerChild, leavingHooks);
                  // switching between different views
                  if (mode === 'out-in') {
                      state.isLeaving = true;
                      // return placeholder node and queue update when leave finishes
                      leavingHooks.afterLeave = () => {
                          state.isLeaving = false;
                          instance.update();
                      };
                      return emptyPlaceholder(child);
                  }
                  else if (mode === 'in-out' && innerChild.type !== Comment) {
                      leavingHooks.delayLeave = (el, earlyRemove, delayedLeave) => {
                          const leavingVNodesCache = getLeavingNodesForType(state, oldInnerChild);
                          leavingVNodesCache[String(oldInnerChild.key)] = oldInnerChild;
                          // early removal callback
                          el._leaveCb = () => {
                              earlyRemove();
                              el._leaveCb = undefined;
                              delete enterHooks.delayedLeave;
                          };
                          enterHooks.delayedLeave = delayedLeave;
                      };
                  }
              }
              return child;
          };
      }
  };
  // export the public type for h/tsx inference
  // also to avoid inline import() in generated d.ts files
  const BaseTransition = BaseTransitionImpl;
  function getLeavingNodesForType(state, vnode) {
      const { leavingVNodes } = state;
      let leavingVNodesCache = leavingVNodes.get(vnode.type);
      if (!leavingVNodesCache) {
          leavingVNodesCache = Object.create(null);
          leavingVNodes.set(vnode.type, leavingVNodesCache);
      }
      return leavingVNodesCache;
  }
  // The transition hooks are attached to the vnode as vnode.transition
  // and will be called at appropriate timing in the renderer.
  function resolveTransitionHooks(vnode, props, state, instance) {
      const { appear, mode, persisted = false, onBeforeEnter, onEnter, onAfterEnter, onEnterCancelled, onBeforeLeave, onLeave, onAfterLeave, onLeaveCancelled, onBeforeAppear, onAppear, onAfterAppear, onAppearCancelled } = props;
      const key = String(vnode.key);
      const leavingVNodesCache = getLeavingNodesForType(state, vnode);
      const callHook = (hook, args) => {
          hook &&
              callWithAsyncErrorHandling(hook, instance, 9 /* TRANSITION_HOOK */, args);
      };
      const hooks = {
          mode,
          persisted,
          beforeEnter(el) {
              let hook = onBeforeEnter;
              if (!state.isMounted) {
                  if (appear) {
                      hook = onBeforeAppear || onBeforeEnter;
                  }
                  else {
                      return;
                  }
              }
              // for same element (v-show)
              if (el._leaveCb) {
                  el._leaveCb(true /* cancelled */);
              }
              // for toggled element with same key (v-if)
              const leavingVNode = leavingVNodesCache[key];
              if (leavingVNode &&
                  isSameVNodeType(vnode, leavingVNode) &&
                  leavingVNode.el._leaveCb) {
                  // force early removal (not cancelled)
                  leavingVNode.el._leaveCb();
              }
              callHook(hook, [el]);
          },
          enter(el) {
              let hook = onEnter;
              let afterHook = onAfterEnter;
              let cancelHook = onEnterCancelled;
              if (!state.isMounted) {
                  if (appear) {
                      hook = onAppear || onEnter;
                      afterHook = onAfterAppear || onAfterEnter;
                      cancelHook = onAppearCancelled || onEnterCancelled;
                  }
                  else {
                      return;
                  }
              }
              let called = false;
              const done = (el._enterCb = (cancelled) => {
                  if (called)
                      return;
                  called = true;
                  if (cancelled) {
                      callHook(cancelHook, [el]);
                  }
                  else {
                      callHook(afterHook, [el]);
                  }
                  if (hooks.delayedLeave) {
                      hooks.delayedLeave();
                  }
                  el._enterCb = undefined;
              });
              if (hook) {
                  hook(el, done);
                  if (hook.length <= 1) {
                      done();
                  }
              }
              else {
                  done();
              }
          },
          leave(el, remove) {
              const key = String(vnode.key);
              if (el._enterCb) {
                  el._enterCb(true /* cancelled */);
              }
              if (state.isUnmounting) {
                  return remove();
              }
              callHook(onBeforeLeave, [el]);
              let called = false;
              const done = (el._leaveCb = (cancelled) => {
                  if (called)
                      return;
                  called = true;
                  remove();
                  if (cancelled) {
                      callHook(onLeaveCancelled, [el]);
                  }
                  else {
                      callHook(onAfterLeave, [el]);
                  }
                  el._leaveCb = undefined;
                  if (leavingVNodesCache[key] === vnode) {
                      delete leavingVNodesCache[key];
                  }
              });
              leavingVNodesCache[key] = vnode;
              if (onLeave) {
                  onLeave(el, done);
                  if (onLeave.length <= 1) {
                      done();
                  }
              }
              else {
                  done();
              }
          },
          clone(vnode) {
              return resolveTransitionHooks(vnode, props, state, instance);
          }
      };
      return hooks;
  }
  // the placeholder really only handles one special case: KeepAlive
  // in the case of a KeepAlive in a leave phase we need to return a KeepAlive
  // placeholder with empty content to avoid the KeepAlive instance from being
  // unmounted.
  function emptyPlaceholder(vnode) {
      if (isKeepAlive(vnode)) {
          vnode = cloneVNode(vnode);
          vnode.children = null;
          return vnode;
      }
  }
  function getKeepAliveChild(vnode) {
      return isKeepAlive(vnode)
          ? vnode.children
              ? vnode.children[0]
              : undefined
          : vnode;
  }
  function setTransitionHooks(vnode, hooks) {
      if (vnode.shapeFlag & 6 /* COMPONENT */ && vnode.component) {
          setTransitionHooks(vnode.component.subTree, hooks);
      }
      else if (vnode.shapeFlag & 128 /* SUSPENSE */) {
          vnode.ssContent.transition = hooks.clone(vnode.ssContent);
          vnode.ssFallback.transition = hooks.clone(vnode.ssFallback);
      }
      else {
          vnode.transition = hooks;
      }
  }
  function getTransitionRawChildren(children, keepComment = false) {
      let ret = [];
      let keyedFragmentCount = 0;
      for (let i = 0; i < children.length; i++) {
          const child = children[i];
          // handle fragment children case, e.g. v-for
          if (child.type === Fragment) {
              if (child.patchFlag & 128 /* KEYED_FRAGMENT */)
                  keyedFragmentCount++;
              ret = ret.concat(getTransitionRawChildren(child.children, keepComment));
          }
          // comment placeholders should be skipped, e.g. v-if
          else if (keepComment || child.type !== Comment) {
              ret.push(child);
          }
      }
      // #1126 if a transition children list contains multiple sub fragments, these
      // fragments will be merged into a flat children array. Since each v-for
      // fragment may contain different static bindings inside, we need to de-op
      // these children to force full diffs to ensure correct behavior.
      if (keyedFragmentCount > 1) {
          for (let i = 0; i < ret.length; i++) {
              ret[i].patchFlag = -2 /* BAIL */;
          }
      }
      return ret;
  }

  const isKeepAlive = (vnode) => vnode.type.__isKeepAlive;
  const KeepAliveImpl = {
      name: `KeepAlive`,
      // Marker for special handling inside the renderer. We are not using a ===
      // check directly on KeepAlive in the renderer, because importing it directly
      // would prevent it from being tree-shaken.
      __isKeepAlive: true,
      props: {
          include: [String, RegExp, Array],
          exclude: [String, RegExp, Array],
          max: [String, Number]
      },
      setup(props, { slots }) {
          const instance = getCurrentInstance();
          // KeepAlive communicates with the instantiated renderer via the
          // ctx where the renderer passes in its internals,
          // and the KeepAlive instance exposes activate/deactivate implementations.
          // The whole point of this is to avoid importing KeepAlive directly in the
          // renderer to facilitate tree-shaking.
          const sharedContext = instance.ctx;
          // if the internal renderer is not registered, it indicates that this is server-side rendering,
          // for KeepAlive, we just need to render its children
          if (!sharedContext.renderer) {
              return slots.default;
          }
          const cache = new Map();
          const keys = new Set();
          let current = null;
          const parentSuspense = instance.suspense;
          const { renderer: { p: patch, m: move, um: _unmount, o: { createElement } } } = sharedContext;
          const storageContainer = createElement('div');
          sharedContext.activate = (vnode, container, anchor, isSVG, optimized) => {
              const instance = vnode.component;
              move(vnode, container, anchor, 0 /* ENTER */, parentSuspense);
              // in case props have changed
              patch(instance.vnode, vnode, container, anchor, instance, parentSuspense, isSVG, vnode.slotScopeIds, optimized);
              queuePostRenderEffect(() => {
                  instance.isDeactivated = false;
                  if (instance.a) {
                      invokeArrayFns(instance.a);
                  }
                  const vnodeHook = vnode.props && vnode.props.onVnodeMounted;
                  if (vnodeHook) {
                      invokeVNodeHook(vnodeHook, instance.parent, vnode);
                  }
              }, parentSuspense);
          };
          sharedContext.deactivate = (vnode) => {
              const instance = vnode.component;
              move(vnode, storageContainer, null, 1 /* LEAVE */, parentSuspense);
              queuePostRenderEffect(() => {
                  if (instance.da) {
                      invokeArrayFns(instance.da);
                  }
                  const vnodeHook = vnode.props && vnode.props.onVnodeUnmounted;
                  if (vnodeHook) {
                      invokeVNodeHook(vnodeHook, instance.parent, vnode);
                  }
                  instance.isDeactivated = true;
              }, parentSuspense);
          };
          function unmount(vnode) {
              // reset the shapeFlag so it can be properly unmounted
              resetShapeFlag(vnode);
              _unmount(vnode, instance, parentSuspense);
          }
          function pruneCache(filter) {
              cache.forEach((vnode, key) => {
                  const name = getComponentName(vnode.type);
                  if (name && (!filter || !filter(name))) {
                      pruneCacheEntry(key);
                  }
              });
          }
          function pruneCacheEntry(key) {
              const cached = cache.get(key);
              if (!current || cached.type !== current.type) {
                  unmount(cached);
              }
              else if (current) {
                  // current active instance should no longer be kept-alive.
                  // we can't unmount it now but it might be later, so reset its flag now.
                  resetShapeFlag(current);
              }
              cache.delete(key);
              keys.delete(key);
          }
          // prune cache on include/exclude prop change
          watch(() => [props.include, props.exclude], ([include, exclude]) => {
              include && pruneCache(name => matches(include, name));
              exclude && pruneCache(name => !matches(exclude, name));
          }, 
          // prune post-render after `current` has been updated
          { flush: 'post', deep: true });
          // cache sub tree after render
          let pendingCacheKey = null;
          const cacheSubtree = () => {
              // fix #1621, the pendingCacheKey could be 0
              if (pendingCacheKey != null) {
                  cache.set(pendingCacheKey, getInnerChild(instance.subTree));
              }
          };
          onMounted(cacheSubtree);
          onUpdated(cacheSubtree);
          onBeforeUnmount(() => {
              cache.forEach(cached => {
                  const { subTree, suspense } = instance;
                  const vnode = getInnerChild(subTree);
                  if (cached.type === vnode.type) {
                      // current instance will be unmounted as part of keep-alive's unmount
                      resetShapeFlag(vnode);
                      // but invoke its deactivated hook here
                      const da = vnode.component.da;
                      da && queuePostRenderEffect(da, suspense);
                      return;
                  }
                  unmount(cached);
              });
          });
          return () => {
              pendingCacheKey = null;
              if (!slots.default) {
                  return null;
              }
              const children = slots.default();
              const rawVNode = children[0];
              if (children.length > 1) {
                  {
                      warn(`KeepAlive should contain exactly one component child.`);
                  }
                  current = null;
                  return children;
              }
              else if (!isVNode(rawVNode) ||
                  (!(rawVNode.shapeFlag & 4 /* STATEFUL_COMPONENT */) &&
                      !(rawVNode.shapeFlag & 128 /* SUSPENSE */))) {
                  current = null;
                  return rawVNode;
              }
              let vnode = getInnerChild(rawVNode);
              const comp = vnode.type;
              const name = getComponentName(comp);
              const { include, exclude, max } = props;
              if ((include && (!name || !matches(include, name))) ||
                  (exclude && name && matches(exclude, name))) {
                  current = vnode;
                  return rawVNode;
              }
              const key = vnode.key == null ? comp : vnode.key;
              const cachedVNode = cache.get(key);
              // clone vnode if it's reused because we are going to mutate it
              if (vnode.el) {
                  vnode = cloneVNode(vnode);
                  if (rawVNode.shapeFlag & 128 /* SUSPENSE */) {
                      rawVNode.ssContent = vnode;
                  }
              }
              // #1513 it's possible for the returned vnode to be cloned due to attr
              // fallthrough or scopeId, so the vnode here may not be the final vnode
              // that is mounted. Instead of caching it directly, we store the pending
              // key and cache `instance.subTree` (the normalized vnode) in
              // beforeMount/beforeUpdate hooks.
              pendingCacheKey = key;
              if (cachedVNode) {
                  // copy over mounted state
                  vnode.el = cachedVNode.el;
                  vnode.component = cachedVNode.component;
                  if (vnode.transition) {
                      // recursively update transition hooks on subTree
                      setTransitionHooks(vnode, vnode.transition);
                  }
                  // avoid vnode being mounted as fresh
                  vnode.shapeFlag |= 512 /* COMPONENT_KEPT_ALIVE */;
                  // make this key the freshest
                  keys.delete(key);
                  keys.add(key);
              }
              else {
                  keys.add(key);
                  // prune oldest entry
                  if (max && keys.size > parseInt(max, 10)) {
                      pruneCacheEntry(keys.values().next().value);
                  }
              }
              // avoid vnode being unmounted
              vnode.shapeFlag |= 256 /* COMPONENT_SHOULD_KEEP_ALIVE */;
              current = vnode;
              return rawVNode;
          };
      }
  };
  // export the public type for h/tsx inference
  // also to avoid inline import() in generated d.ts files
  const KeepAlive = KeepAliveImpl;
  function matches(pattern, name) {
      if (isArray(pattern)) {
          return pattern.some((p) => matches(p, name));
      }
      else if (isString(pattern)) {
          return pattern.split(',').indexOf(name) > -1;
      }
      else if (pattern.test) {
          return pattern.test(name);
      }
      /* istanbul ignore next */
      return false;
  }
  function onActivated(hook, target) {
      registerKeepAliveHook(hook, "a" /* ACTIVATED */, target);
  }
  function onDeactivated(hook, target) {
      registerKeepAliveHook(hook, "da" /* DEACTIVATED */, target);
  }
  function registerKeepAliveHook(hook, type, target = currentInstance) {
      // cache the deactivate branch check wrapper for injected hooks so the same
      // hook can be properly deduped by the scheduler. "__wdc" stands for "with
      // deactivation check".
      const wrappedHook = hook.__wdc ||
          (hook.__wdc = () => {
              // only fire the hook if the target instance is NOT in a deactivated branch.
              let current = target;
              while (current) {
                  if (current.isDeactivated) {
                      return;
                  }
                  current = current.parent;
              }
              hook();
          });
      injectHook(type, wrappedHook, target);
      // In addition to registering it on the target instance, we walk up the parent
      // chain and register it on all ancestor instances that are keep-alive roots.
      // This avoids the need to walk the entire component tree when invoking these
      // hooks, and more importantly, avoids the need to track child components in
      // arrays.
      if (target) {
          let current = target.parent;
          while (current && current.parent) {
              if (isKeepAlive(current.parent.vnode)) {
                  injectToKeepAliveRoot(wrappedHook, type, target, current);
              }
              current = current.parent;
          }
      }
  }
  function injectToKeepAliveRoot(hook, type, target, keepAliveRoot) {
      // injectHook wraps the original for error handling, so make sure to remove
      // the wrapped version.
      const injected = injectHook(type, hook, keepAliveRoot, true /* prepend */);
      onUnmounted(() => {
          remove(keepAliveRoot[type], injected);
      }, target);
  }
  function resetShapeFlag(vnode) {
      let shapeFlag = vnode.shapeFlag;
      if (shapeFlag & 256 /* COMPONENT_SHOULD_KEEP_ALIVE */) {
          shapeFlag -= 256 /* COMPONENT_SHOULD_KEEP_ALIVE */;
      }
      if (shapeFlag & 512 /* COMPONENT_KEPT_ALIVE */) {
          shapeFlag -= 512 /* COMPONENT_KEPT_ALIVE */;
      }
      vnode.shapeFlag = shapeFlag;
  }
  function getInnerChild(vnode) {
      return vnode.shapeFlag & 128 /* SUSPENSE */ ? vnode.ssContent : vnode;
  }

  const isInternalKey = (key) => key[0] === '_' || key === '$stable';
  const normalizeSlotValue = (value) => isArray(value)
      ? value.map(normalizeVNode)
      : [normalizeVNode(value)];
  const normalizeSlot = (key, rawSlot, ctx) => withCtx((props) => {
      if (currentInstance) {
          warn(`Slot "${key}" invoked outside of the render function: ` +
              `this will not track dependencies used in the slot. ` +
              `Invoke the slot function inside the render function instead.`);
      }
      return normalizeSlotValue(rawSlot(props));
  }, ctx);
  const normalizeObjectSlots = (rawSlots, slots) => {
      const ctx = rawSlots._ctx;
      for (const key in rawSlots) {
          if (isInternalKey(key))
              continue;
          const value = rawSlots[key];
          if (isFunction(value)) {
              slots[key] = normalizeSlot(key, value, ctx);
          }
          else if (value != null) {
              {
                  warn(`Non-function value encountered for slot "${key}". ` +
                      `Prefer function slots for better performance.`);
              }
              const normalized = normalizeSlotValue(value);
              slots[key] = () => normalized;
          }
      }
  };
  const normalizeVNodeSlots = (instance, children) => {
      if (!isKeepAlive(instance.vnode)) {
          warn(`Non-function value encountered for default slot. ` +
              `Prefer function slots for better performance.`);
      }
      const normalized = normalizeSlotValue(children);
      instance.slots.default = () => normalized;
  };
  const initSlots = (instance, children) => {
      if (instance.vnode.shapeFlag & 32 /* SLOTS_CHILDREN */) {
          const type = children._;
          if (type) {
              instance.slots = children;
              // make compiler marker non-enumerable
              def(children, '_', type);
          }
          else {
              normalizeObjectSlots(children, (instance.slots = {}));
          }
      }
      else {
          instance.slots = {};
          if (children) {
              normalizeVNodeSlots(instance, children);
          }
      }
      def(instance.slots, InternalObjectKey, 1);
  };
  const updateSlots = (instance, children, optimized) => {
      const { vnode, slots } = instance;
      let needDeletionCheck = true;
      let deletionComparisonTarget = EMPTY_OBJ;
      if (vnode.shapeFlag & 32 /* SLOTS_CHILDREN */) {
          const type = children._;
          if (type) {
              // compiled slots.
              if (isHmrUpdating) {
                  // Parent was HMR updated so slot content may have changed.
                  // force update slots and mark instance for hmr as well
                  extend(slots, children);
              }
              else if (optimized && type === 1 /* STABLE */) {
                  // compiled AND stable.
                  // no need to update, and skip stale slots removal.
                  needDeletionCheck = false;
              }
              else {
                  // compiled but dynamic (v-if/v-for on slots) - update slots, but skip
                  // normalization.
                  extend(slots, children);
                  // #2893
                  // when rendering the optimized slots by manually written render function,
                  // we need to delete the `slots._` flag if necessary to make subsequent updates reliable,
                  // i.e. let the `renderSlot` create the bailed Fragment
                  if (!optimized && type === 1 /* STABLE */) {
                      delete slots._;
                  }
              }
          }
          else {
              needDeletionCheck = !children.$stable;
              normalizeObjectSlots(children, slots);
          }
          deletionComparisonTarget = children;
      }
      else if (children) {
          // non slot object children (direct value) passed to a component
          normalizeVNodeSlots(instance, children);
          deletionComparisonTarget = { default: 1 };
      }
      // delete stale slots
      if (needDeletionCheck) {
          for (const key in slots) {
              if (!isInternalKey(key) && !(key in deletionComparisonTarget)) {
                  delete slots[key];
              }
          }
      }
  };

  /**
  Runtime helper for applying directives to a vnode. Example usage:

  const comp = resolveComponent('comp')
  const foo = resolveDirective('foo')
  const bar = resolveDirective('bar')

  return withDirectives(h(comp), [
    [foo, this.x],
    [bar, this.y]
  ])
  */
  const isBuiltInDirective = /*#__PURE__*/ makeMap('bind,cloak,else-if,else,for,html,if,model,on,once,pre,show,slot,text');
  function validateDirectiveName(name) {
      if (isBuiltInDirective(name)) {
          warn('Do not use built-in directive ids as custom directive id: ' + name);
      }
  }
  /**
   * Adds directives to a VNode.
   */
  function withDirectives(vnode, directives) {
      const internalInstance = currentRenderingInstance;
      if (internalInstance === null) {
          warn(`withDirectives can only be used inside render functions.`);
          return vnode;
      }
      const instance = internalInstance.proxy;
      const bindings = vnode.dirs || (vnode.dirs = []);
      for (let i = 0; i < directives.length; i++) {
          let [dir, value, arg, modifiers = EMPTY_OBJ] = directives[i];
          if (isFunction(dir)) {
              dir = {
                  mounted: dir,
                  updated: dir
              };
          }
          bindings.push({
              dir,
              instance,
              value,
              oldValue: void 0,
              arg,
              modifiers
          });
      }
      return vnode;
  }
  function invokeDirectiveHook(vnode, prevVNode, instance, name) {
      const bindings = vnode.dirs;
      const oldBindings = prevVNode && prevVNode.dirs;
      for (let i = 0; i < bindings.length; i++) {
          const binding = bindings[i];
          if (oldBindings) {
              binding.oldValue = oldBindings[i].value;
          }
          const hook = binding.dir[name];
          if (hook) {
              callWithAsyncErrorHandling(hook, instance, 8 /* DIRECTIVE_HOOK */, [
                  vnode.el,
                  binding,
                  vnode,
                  prevVNode
              ]);
          }
      }
  }

  function createAppContext() {
      return {
          app: null,
          config: {
              isNativeTag: NO,
              performance: false,
              globalProperties: {},
              optionMergeStrategies: {},
              isCustomElement: NO,
              errorHandler: undefined,
              warnHandler: undefined
          },
          mixins: [],
          components: {},
          directives: {},
          provides: Object.create(null)
      };
  }
  let uid$1 = 0;
  function createAppAPI(render, hydrate) {
      return function createApp(rootComponent, rootProps = null) {
          if (rootProps != null && !isObject(rootProps)) {
              warn(`root props passed to app.mount() must be an object.`);
              rootProps = null;
          }
          const context = createAppContext();
          const installedPlugins = new Set();
          let isMounted = false;
          const app = (context.app = {
              _uid: uid$1++,
              _component: rootComponent,
              _props: rootProps,
              _container: null,
              _context: context,
              version,
              get config() {
                  return context.config;
              },
              set config(v) {
                  {
                      warn(`app.config cannot be replaced. Modify individual options instead.`);
                  }
              },
              use(plugin, ...options) {
                  if (installedPlugins.has(plugin)) {
                      warn(`Plugin has already been applied to target app.`);
                  }
                  else if (plugin && isFunction(plugin.install)) {
                      installedPlugins.add(plugin);
                      plugin.install(app, ...options);
                  }
                  else if (isFunction(plugin)) {
                      installedPlugins.add(plugin);
                      plugin(app, ...options);
                  }
                  else {
                      warn(`A plugin must either be a function or an object with an "install" ` +
                          `function.`);
                  }
                  return app;
              },
              mixin(mixin) {
                  {
                      if (!context.mixins.includes(mixin)) {
                          context.mixins.push(mixin);
                          // global mixin with props/emits de-optimizes props/emits
                          // normalization caching.
                          if (mixin.props || mixin.emits) {
                              context.deopt = true;
                          }
                      }
                      else {
                          warn('Mixin has already been applied to target app' +
                              (mixin.name ? `: ${mixin.name}` : ''));
                      }
                  }
                  return app;
              },
              component(name, component) {
                  {
                      validateComponentName(name, context.config);
                  }
                  if (!component) {
                      return context.components[name];
                  }
                  if (context.components[name]) {
                      warn(`Component "${name}" has already been registered in target app.`);
                  }
                  context.components[name] = component;
                  return app;
              },
              directive(name, directive) {
                  {
                      validateDirectiveName(name);
                  }
                  if (!directive) {
                      return context.directives[name];
                  }
                  if (context.directives[name]) {
                      warn(`Directive "${name}" has already been registered in target app.`);
                  }
                  context.directives[name] = directive;
                  return app;
              },
              mount(rootContainer, isHydrate, isSVG) {
                  if (!isMounted) {
                      const vnode = createVNode(rootComponent, rootProps);
                      // store app context on the root VNode.
                      // this will be set on the root instance on initial mount.
                      vnode.appContext = context;
                      // HMR root reload
                      {
                          context.reload = () => {
                              render(cloneVNode(vnode), rootContainer, isSVG);
                          };
                      }
                      if (isHydrate && hydrate) {
                          hydrate(vnode, rootContainer);
                      }
                      else {
                          render(vnode, rootContainer, isSVG);
                      }
                      isMounted = true;
                      app._container = rootContainer;
                      rootContainer.__vue_app__ = app;
                      {
                          devtoolsInitApp(app, version);
                      }
                      return vnode.component.proxy;
                  }
                  else {
                      warn(`App has already been mounted.\n` +
                          `If you want to remount the same app, move your app creation logic ` +
                          `into a factory function and create fresh app instances for each ` +
                          `mount - e.g. \`const createMyApp = () => createApp(App)\``);
                  }
              },
              unmount() {
                  if (isMounted) {
                      render(null, app._container);
                      {
                          devtoolsUnmountApp(app);
                      }
                      delete app._container.__vue_app__;
                  }
                  else {
                      warn(`Cannot unmount an app that is not mounted.`);
                  }
              },
              provide(key, value) {
                  if (key in context.provides) {
                      warn(`App already provides property with key "${String(key)}". ` +
                          `It will be overwritten with the new value.`);
                  }
                  // TypeScript doesn't allow symbols as index type
                  // https://github.com/Microsoft/TypeScript/issues/24587
                  context.provides[key] = value;
                  return app;
              }
          });
          return app;
      };
  }

  let hasMismatch = false;
  const isSVGContainer = (container) => /svg/.test(container.namespaceURI) && container.tagName !== 'foreignObject';
  const isComment = (node) => node.nodeType === 8 /* COMMENT */;
  // Note: hydration is DOM-specific
  // But we have to place it in core due to tight coupling with core - splitting
  // it out creates a ton of unnecessary complexity.
  // Hydration also depends on some renderer internal logic which needs to be
  // passed in via arguments.
  function createHydrationFunctions(rendererInternals) {
      const { mt: mountComponent, p: patch, o: { patchProp, nextSibling, parentNode, remove, insert, createComment } } = rendererInternals;
      const hydrate = (vnode, container) => {
          if (!container.hasChildNodes()) {
              warn(`Attempting to hydrate existing markup but container is empty. ` +
                  `Performing full mount instead.`);
              patch(null, vnode, container);
              return;
          }
          hasMismatch = false;
          hydrateNode(container.firstChild, vnode, null, null, null);
          flushPostFlushCbs();
          if (hasMismatch && !false) {
              // this error should show up in production
              console.error(`Hydration completed but contains mismatches.`);
          }
      };
      const hydrateNode = (node, vnode, parentComponent, parentSuspense, slotScopeIds, optimized = false) => {
          const isFragmentStart = isComment(node) && node.data === '[';
          const onMismatch = () => handleMismatch(node, vnode, parentComponent, parentSuspense, slotScopeIds, isFragmentStart);
          const { type, ref, shapeFlag } = vnode;
          const domType = node.nodeType;
          vnode.el = node;
          let nextNode = null;
          switch (type) {
              case Text:
                  if (domType !== 3 /* TEXT */) {
                      nextNode = onMismatch();
                  }
                  else {
                      if (node.data !== vnode.children) {
                          hasMismatch = true;
                          warn(`Hydration text mismatch:` +
                                  `\n- Client: ${JSON.stringify(node.data)}` +
                                  `\n- Server: ${JSON.stringify(vnode.children)}`);
                          node.data = vnode.children;
                      }
                      nextNode = nextSibling(node);
                  }
                  break;
              case Comment:
                  if (domType !== 8 /* COMMENT */ || isFragmentStart) {
                      nextNode = onMismatch();
                  }
                  else {
                      nextNode = nextSibling(node);
                  }
                  break;
              case Static:
                  if (domType !== 1 /* ELEMENT */) {
                      nextNode = onMismatch();
                  }
                  else {
                      // determine anchor, adopt content
                      nextNode = node;
                      // if the static vnode has its content stripped during build,
                      // adopt it from the server-rendered HTML.
                      const needToAdoptContent = !vnode.children.length;
                      for (let i = 0; i < vnode.staticCount; i++) {
                          if (needToAdoptContent)
                              vnode.children += nextNode.outerHTML;
                          if (i === vnode.staticCount - 1) {
                              vnode.anchor = nextNode;
                          }
                          nextNode = nextSibling(nextNode);
                      }
                      return nextNode;
                  }
                  break;
              case Fragment:
                  if (!isFragmentStart) {
                      nextNode = onMismatch();
                  }
                  else {
                      nextNode = hydrateFragment(node, vnode, parentComponent, parentSuspense, slotScopeIds, optimized);
                  }
                  break;
              default:
                  if (shapeFlag & 1 /* ELEMENT */) {
                      if (domType !== 1 /* ELEMENT */ ||
                          vnode.type.toLowerCase() !==
                              node.tagName.toLowerCase()) {
                          nextNode = onMismatch();
                      }
                      else {
                          nextNode = hydrateElement(node, vnode, parentComponent, parentSuspense, slotScopeIds, optimized);
                      }
                  }
                  else if (shapeFlag & 6 /* COMPONENT */) {
                      // when setting up the render effect, if the initial vnode already
                      // has .el set, the component will perform hydration instead of mount
                      // on its sub-tree.
                      vnode.slotScopeIds = slotScopeIds;
                      const container = parentNode(node);
                      const hydrateComponent = () => {
                          mountComponent(vnode, container, null, parentComponent, parentSuspense, isSVGContainer(container), optimized);
                      };
                      // async component
                      const loadAsync = vnode.type.__asyncLoader;
                      if (loadAsync) {
                          loadAsync().then(hydrateComponent);
                      }
                      else {
                          hydrateComponent();
                      }
                      // component may be async, so in the case of fragments we cannot rely
                      // on component's rendered output to determine the end of the fragment
                      // instead, we do a lookahead to find the end anchor node.
                      nextNode = isFragmentStart
                          ? locateClosingAsyncAnchor(node)
                          : nextSibling(node);
                  }
                  else if (shapeFlag & 64 /* TELEPORT */) {
                      if (domType !== 8 /* COMMENT */) {
                          nextNode = onMismatch();
                      }
                      else {
                          nextNode = vnode.type.hydrate(node, vnode, parentComponent, parentSuspense, slotScopeIds, optimized, rendererInternals, hydrateChildren);
                      }
                  }
                  else if (shapeFlag & 128 /* SUSPENSE */) {
                      nextNode = vnode.type.hydrate(node, vnode, parentComponent, parentSuspense, isSVGContainer(parentNode(node)), slotScopeIds, optimized, rendererInternals, hydrateNode);
                  }
                  else {
                      warn('Invalid HostVNode type:', type, `(${typeof type})`);
                  }
          }
          if (ref != null) {
              setRef(ref, null, parentSuspense, vnode);
          }
          return nextNode;
      };
      const hydrateElement = (el, vnode, parentComponent, parentSuspense, slotScopeIds, optimized) => {
          optimized = optimized || !!vnode.dynamicChildren;
          const { props, patchFlag, shapeFlag, dirs } = vnode;
          // skip props & children if this is hoisted static nodes
          if (patchFlag !== -1 /* HOISTED */) {
              if (dirs) {
                  invokeDirectiveHook(vnode, null, parentComponent, 'created');
              }
              // props
              if (props) {
                  if (!optimized ||
                      (patchFlag & 16 /* FULL_PROPS */ ||
                          patchFlag & 32 /* HYDRATE_EVENTS */)) {
                      for (const key in props) {
                          if (!isReservedProp(key) && isOn(key)) {
                              patchProp(el, key, null, props[key]);
                          }
                      }
                  }
                  else if (props.onClick) {
                      // Fast path for click listeners (which is most often) to avoid
                      // iterating through props.
                      patchProp(el, 'onClick', null, props.onClick);
                  }
              }
              // vnode / directive hooks
              let vnodeHooks;
              if ((vnodeHooks = props && props.onVnodeBeforeMount)) {
                  invokeVNodeHook(vnodeHooks, parentComponent, vnode);
              }
              if (dirs) {
                  invokeDirectiveHook(vnode, null, parentComponent, 'beforeMount');
              }
              if ((vnodeHooks = props && props.onVnodeMounted) || dirs) {
                  queueEffectWithSuspense(() => {
                      vnodeHooks && invokeVNodeHook(vnodeHooks, parentComponent, vnode);
                      dirs && invokeDirectiveHook(vnode, null, parentComponent, 'mounted');
                  }, parentSuspense);
              }
              // children
              if (shapeFlag & 16 /* ARRAY_CHILDREN */ &&
                  // skip if element has innerHTML / textContent
                  !(props && (props.innerHTML || props.textContent))) {
                  let next = hydrateChildren(el.firstChild, vnode, el, parentComponent, parentSuspense, slotScopeIds, optimized);
                  let hasWarned = false;
                  while (next) {
                      hasMismatch = true;
                      if (!hasWarned) {
                          warn(`Hydration children mismatch in <${vnode.type}>: ` +
                              `server rendered element contains more child nodes than client vdom.`);
                          hasWarned = true;
                      }
                      // The SSRed DOM contains more nodes than it should. Remove them.
                      const cur = next;
                      next = next.nextSibling;
                      remove(cur);
                  }
              }
              else if (shapeFlag & 8 /* TEXT_CHILDREN */) {
                  if (el.textContent !== vnode.children) {
                      hasMismatch = true;
                      warn(`Hydration text content mismatch in <${vnode.type}>:\n` +
                              `- Client: ${el.textContent}\n` +
                              `- Server: ${vnode.children}`);
                      el.textContent = vnode.children;
                  }
              }
          }
          return el.nextSibling;
      };
      const hydrateChildren = (node, parentVNode, container, parentComponent, parentSuspense, slotScopeIds, optimized) => {
          optimized = optimized || !!parentVNode.dynamicChildren;
          const children = parentVNode.children;
          const l = children.length;
          let hasWarned = false;
          for (let i = 0; i < l; i++) {
              const vnode = optimized
                  ? children[i]
                  : (children[i] = normalizeVNode(children[i]));
              if (node) {
                  node = hydrateNode(node, vnode, parentComponent, parentSuspense, slotScopeIds, optimized);
              }
              else if (vnode.type === Text && !vnode.children) {
                  continue;
              }
              else {
                  hasMismatch = true;
                  if (!hasWarned) {
                      warn(`Hydration children mismatch in <${container.tagName.toLowerCase()}>: ` +
                          `server rendered element contains fewer child nodes than client vdom.`);
                      hasWarned = true;
                  }
                  // the SSRed DOM didn't contain enough nodes. Mount the missing ones.
                  patch(null, vnode, container, null, parentComponent, parentSuspense, isSVGContainer(container), slotScopeIds);
              }
          }
          return node;
      };
      const hydrateFragment = (node, vnode, parentComponent, parentSuspense, slotScopeIds, optimized) => {
          const { slotScopeIds: fragmentSlotScopeIds } = vnode;
          if (fragmentSlotScopeIds) {
              slotScopeIds = slotScopeIds
                  ? slotScopeIds.concat(fragmentSlotScopeIds)
                  : fragmentSlotScopeIds;
          }
          const container = parentNode(node);
          const next = hydrateChildren(nextSibling(node), vnode, container, parentComponent, parentSuspense, slotScopeIds, optimized);
          if (next && isComment(next) && next.data === ']') {
              return nextSibling((vnode.anchor = next));
          }
          else {
              // fragment didn't hydrate successfully, since we didn't get a end anchor
              // back. This should have led to node/children mismatch warnings.
              hasMismatch = true;
              // since the anchor is missing, we need to create one and insert it
              insert((vnode.anchor = createComment(`]`)), container, next);
              return next;
          }
      };
      const handleMismatch = (node, vnode, parentComponent, parentSuspense, slotScopeIds, isFragment) => {
          hasMismatch = true;
          warn(`Hydration node mismatch:\n- Client vnode:`, vnode.type, `\n- Server rendered DOM:`, node, node.nodeType === 3 /* TEXT */
                  ? `(text)`
                  : isComment(node) && node.data === '['
                      ? `(start of fragment)`
                      : ``);
          vnode.el = null;
          if (isFragment) {
              // remove excessive fragment nodes
              const end = locateClosingAsyncAnchor(node);
              while (true) {
                  const next = nextSibling(node);
                  if (next && next !== end) {
                      remove(next);
                  }
                  else {
                      break;
                  }
              }
          }
          const next = nextSibling(node);
          const container = parentNode(node);
          remove(node);
          patch(null, vnode, container, next, parentComponent, parentSuspense, isSVGContainer(container), slotScopeIds);
          return next;
      };
      const locateClosingAsyncAnchor = (node) => {
          let match = 0;
          while (node) {
              node = nextSibling(node);
              if (node && isComment(node)) {
                  if (node.data === '[')
                      match++;
                  if (node.data === ']') {
                      if (match === 0) {
                          return nextSibling(node);
                      }
                      else {
                          match--;
                      }
                  }
              }
          }
          return node;
      };
      return [hydrate, hydrateNode];
  }

  let supported;
  let perf;
  function startMeasure(instance, type) {
      if (instance.appContext.config.performance && isSupported()) {
          perf.mark(`vue-${type}-${instance.uid}`);
      }
  }
  function endMeasure(instance, type) {
      if (instance.appContext.config.performance && isSupported()) {
          const startTag = `vue-${type}-${instance.uid}`;
          const endTag = startTag + `:end`;
          perf.mark(endTag);
          perf.measure(`<${formatComponentName(instance, instance.type)}> ${type}`, startTag, endTag);
          perf.clearMarks(startTag);
          perf.clearMarks(endTag);
      }
  }
  function isSupported() {
      if (supported !== undefined) {
          return supported;
      }
      /* eslint-disable no-restricted-globals */
      if (typeof window !== 'undefined' && window.performance) {
          supported = true;
          perf = window.performance;
      }
      else {
          supported = false;
      }
      /* eslint-enable no-restricted-globals */
      return supported;
  }

  // implementation, close to no-op
  function defineComponent(options) {
      return isFunction(options) ? { setup: options, name: options.name } : options;
  }

  const isAsyncWrapper = (i) => !!i.type.__asyncLoader;
  function defineAsyncComponent(source) {
      if (isFunction(source)) {
          source = { loader: source };
      }
      const { loader, loadingComponent, errorComponent, delay = 200, timeout, // undefined = never times out
      suspensible = true, onError: userOnError } = source;
      let pendingRequest = null;
      let resolvedComp;
      let retries = 0;
      const retry = () => {
          retries++;
          pendingRequest = null;
          return load();
      };
      const load = () => {
          let thisRequest;
          return (pendingRequest ||
              (thisRequest = pendingRequest = loader()
                  .catch(err => {
                  err = err instanceof Error ? err : new Error(String(err));
                  if (userOnError) {
                      return new Promise((resolve, reject) => {
                          const userRetry = () => resolve(retry());
                          const userFail = () => reject(err);
                          userOnError(err, userRetry, userFail, retries + 1);
                      });
                  }
                  else {
                      throw err;
                  }
              })
                  .then((comp) => {
                  if (thisRequest !== pendingRequest && pendingRequest) {
                      return pendingRequest;
                  }
                  if (!comp) {
                      warn(`Async component loader resolved to undefined. ` +
                          `If you are using retry(), make sure to return its return value.`);
                  }
                  // interop module default
                  if (comp &&
                      (comp.__esModule || comp[Symbol.toStringTag] === 'Module')) {
                      comp = comp.default;
                  }
                  if (comp && !isObject(comp) && !isFunction(comp)) {
                      throw new Error(`Invalid async component load result: ${comp}`);
                  }
                  resolvedComp = comp;
                  return comp;
              })));
      };
      return defineComponent({
          __asyncLoader: load,
          name: 'AsyncComponentWrapper',
          setup() {
              const instance = currentInstance;
              // already resolved
              if (resolvedComp) {
                  return () => createInnerComp(resolvedComp, instance);
              }
              const onError = (err) => {
                  pendingRequest = null;
                  handleError(err, instance, 13 /* ASYNC_COMPONENT_LOADER */, !errorComponent /* do not throw in dev if user provided error component */);
              };
              // suspense-controlled or SSR.
              if ((suspensible && instance.suspense) ||
                  (false )) {
                  return load()
                      .then(comp => {
                      return () => createInnerComp(comp, instance);
                  })
                      .catch(err => {
                      onError(err);
                      return () => errorComponent
                          ? createVNode(errorComponent, {
                              error: err
                          })
                          : null;
                  });
              }
              const loaded = ref(false);
              const error = ref();
              const delayed = ref(!!delay);
              if (delay) {
                  setTimeout(() => {
                      delayed.value = false;
                  }, delay);
              }
              if (timeout != null) {
                  setTimeout(() => {
                      if (!loaded.value && !error.value) {
                          const err = new Error(`Async component timed out after ${timeout}ms.`);
                          onError(err);
                          error.value = err;
                      }
                  }, timeout);
              }
              load()
                  .then(() => {
                  loaded.value = true;
              })
                  .catch(err => {
                  onError(err);
                  error.value = err;
              });
              return () => {
                  if (loaded.value && resolvedComp) {
                      return createInnerComp(resolvedComp, instance);
                  }
                  else if (error.value && errorComponent) {
                      return createVNode(errorComponent, {
                          error: error.value
                      });
                  }
                  else if (loadingComponent && !delayed.value) {
                      return createVNode(loadingComponent);
                  }
              };
          }
      });
  }
  function createInnerComp(comp, { vnode: { ref, props, children } }) {
      const vnode = createVNode(comp, props, children);
      // ensure inner component inherits the async wrapper's ref owner
      vnode.ref = ref;
      return vnode;
  }

  function createDevEffectOptions(instance) {
      return {
          scheduler: queueJob,
          allowRecurse: true,
          onTrack: instance.rtc ? e => invokeArrayFns(instance.rtc, e) : void 0,
          onTrigger: instance.rtg ? e => invokeArrayFns(instance.rtg, e) : void 0
      };
  }
  const queuePostRenderEffect = queueEffectWithSuspense
      ;
  const setRef = (rawRef, oldRawRef, parentSuspense, vnode) => {
      if (isArray(rawRef)) {
          rawRef.forEach((r, i) => setRef(r, oldRawRef && (isArray(oldRawRef) ? oldRawRef[i] : oldRawRef), parentSuspense, vnode));
          return;
      }
      let value;
      if (!vnode) {
          // means unmount
          value = null;
      }
      else if (isAsyncWrapper(vnode)) {
          // when mounting async components, nothing needs to be done,
          // because the template ref is forwarded to inner component
          return;
      }
      else if (vnode.shapeFlag & 4 /* STATEFUL_COMPONENT */) {
          value = vnode.component.exposed || vnode.component.proxy;
      }
      else {
          value = vnode.el;
      }
      const { i: owner, r: ref } = rawRef;
      if (!owner) {
          warn(`Missing ref owner context. ref cannot be used on hoisted vnodes. ` +
              `A vnode with ref must be created inside the render function.`);
          return;
      }
      const oldRef = oldRawRef && oldRawRef.r;
      const refs = owner.refs === EMPTY_OBJ ? (owner.refs = {}) : owner.refs;
      const setupState = owner.setupState;
      // unset old ref
      if (oldRef != null && oldRef !== ref) {
          if (isString(oldRef)) {
              refs[oldRef] = null;
              if (hasOwn(setupState, oldRef)) {
                  setupState[oldRef] = null;
              }
          }
          else if (isRef(oldRef)) {
              oldRef.value = null;
          }
      }
      if (isString(ref)) {
          const doSet = () => {
              refs[ref] = value;
              if (hasOwn(setupState, ref)) {
                  setupState[ref] = value;
              }
          };
          // #1789: for non-null values, set them after render
          // null values means this is unmount and it should not overwrite another
          // ref with the same key
          if (value) {
              doSet.id = -1;
              queuePostRenderEffect(doSet, parentSuspense);
          }
          else {
              doSet();
          }
      }
      else if (isRef(ref)) {
          const doSet = () => {
              ref.value = value;
          };
          if (value) {
              doSet.id = -1;
              queuePostRenderEffect(doSet, parentSuspense);
          }
          else {
              doSet();
          }
      }
      else if (isFunction(ref)) {
          callWithErrorHandling(ref, owner, 12 /* FUNCTION_REF */, [value, refs]);
      }
      else {
          warn('Invalid template ref type:', value, `(${typeof value})`);
      }
  };
  /**
   * The createRenderer function accepts two generic arguments:
   * HostNode and HostElement, corresponding to Node and Element types in the
   * host environment. For example, for runtime-dom, HostNode would be the DOM
   * `Node` interface and HostElement would be the DOM `Element` interface.
   *
   * Custom renderers can pass in the platform specific types like this:
   *
   * ``` js
   * const { render, createApp } = createRenderer<Node, Element>({
   *   patchProp,
   *   ...nodeOps
   * })
   * ```
   */
  function createRenderer(options) {
      return baseCreateRenderer(options);
  }
  // Separate API for creating hydration-enabled renderer.
  // Hydration logic is only used when calling this function, making it
  // tree-shakable.
  function createHydrationRenderer(options) {
      return baseCreateRenderer(options, createHydrationFunctions);
  }
  // implementation
  function baseCreateRenderer(options, createHydrationFns) {
      {
          const target = getGlobalThis();
          target.__VUE__ = true;
          setDevtoolsHook(target.__VUE_DEVTOOLS_GLOBAL_HOOK__);
      }
      const { insert: hostInsert, remove: hostRemove, patchProp: hostPatchProp, forcePatchProp: hostForcePatchProp, createElement: hostCreateElement, createText: hostCreateText, createComment: hostCreateComment, setText: hostSetText, setElementText: hostSetElementText, parentNode: hostParentNode, nextSibling: hostNextSibling, setScopeId: hostSetScopeId = NOOP, cloneNode: hostCloneNode, insertStaticContent: hostInsertStaticContent } = options;
      // Note: functions inside this closure should use `const xxx = () => {}`
      // style in order to prevent being inlined by minifiers.
      const patch = (n1, n2, container, anchor = null, parentComponent = null, parentSuspense = null, isSVG = false, slotScopeIds = null, optimized = false) => {
          // patching & not same type, unmount old tree
          if (n1 && !isSameVNodeType(n1, n2)) {
              anchor = getNextHostNode(n1);
              unmount(n1, parentComponent, parentSuspense, true);
              n1 = null;
          }
          if (n2.patchFlag === -2 /* BAIL */) {
              optimized = false;
              n2.dynamicChildren = null;
          }
          const { type, ref, shapeFlag } = n2;
          switch (type) {
              case Text:
                  processText(n1, n2, container, anchor);
                  break;
              case Comment:
                  processCommentNode(n1, n2, container, anchor);
                  break;
              case Static:
                  if (n1 == null) {
                      mountStaticNode(n2, container, anchor, isSVG);
                  }
                  else {
                      patchStaticNode(n1, n2, container, isSVG);
                  }
                  break;
              case Fragment:
                  processFragment(n1, n2, container, anchor, parentComponent, parentSuspense, isSVG, slotScopeIds, optimized);
                  break;
              default:
                  if (shapeFlag & 1 /* ELEMENT */) {
                      processElement(n1, n2, container, anchor, parentComponent, parentSuspense, isSVG, slotScopeIds, optimized);
                  }
                  else if (shapeFlag & 6 /* COMPONENT */) {
                      processComponent(n1, n2, container, anchor, parentComponent, parentSuspense, isSVG, slotScopeIds, optimized);
                  }
                  else if (shapeFlag & 64 /* TELEPORT */) {
                      type.process(n1, n2, container, anchor, parentComponent, parentSuspense, isSVG, slotScopeIds, optimized, internals);
                  }
                  else if (shapeFlag & 128 /* SUSPENSE */) {
                      type.process(n1, n2, container, anchor, parentComponent, parentSuspense, isSVG, slotScopeIds, optimized, internals);
                  }
                  else {
                      warn('Invalid VNode type:', type, `(${typeof type})`);
                  }
          }
          // set ref
          if (ref != null && parentComponent) {
              setRef(ref, n1 && n1.ref, parentSuspense, n2);
          }
      };
      const processText = (n1, n2, container, anchor) => {
          if (n1 == null) {
              hostInsert((n2.el = hostCreateText(n2.children)), container, anchor);
          }
          else {
              const el = (n2.el = n1.el);
              if (n2.children !== n1.children) {
                  hostSetText(el, n2.children);
              }
          }
      };
      const processCommentNode = (n1, n2, container, anchor) => {
          if (n1 == null) {
              hostInsert((n2.el = hostCreateComment(n2.children || '')), container, anchor);
          }
          else {
              // there's no support for dynamic comments
              n2.el = n1.el;
          }
      };
      const mountStaticNode = (n2, container, anchor, isSVG) => {
          [n2.el, n2.anchor] = hostInsertStaticContent(n2.children, container, anchor, isSVG);
      };
      /**
       * Dev / HMR only
       */
      const patchStaticNode = (n1, n2, container, isSVG) => {
          // static nodes are only patched during dev for HMR
          if (n2.children !== n1.children) {
              const anchor = hostNextSibling(n1.anchor);
              // remove existing
              removeStaticNode(n1);
              [n2.el, n2.anchor] = hostInsertStaticContent(n2.children, container, anchor, isSVG);
          }
          else {
              n2.el = n1.el;
              n2.anchor = n1.anchor;
          }
      };
      const moveStaticNode = ({ el, anchor }, container, nextSibling) => {
          let next;
          while (el && el !== anchor) {
              next = hostNextSibling(el);
              hostInsert(el, container, nextSibling);
              el = next;
          }
          hostInsert(anchor, container, nextSibling);
      };
      const removeStaticNode = ({ el, anchor }) => {
          let next;
          while (el && el !== anchor) {
              next = hostNextSibling(el);
              hostRemove(el);
              el = next;
          }
          hostRemove(anchor);
      };
      const processElement = (n1, n2, container, anchor, parentComponent, parentSuspense, isSVG, slotScopeIds, optimized) => {
          isSVG = isSVG || n2.type === 'svg';
          if (n1 == null) {
              mountElement(n2, container, anchor, parentComponent, parentSuspense, isSVG, slotScopeIds, optimized);
          }
          else {
              patchElement(n1, n2, parentComponent, parentSuspense, isSVG, slotScopeIds, optimized);
          }
      };
      const mountElement = (vnode, container, anchor, parentComponent, parentSuspense, isSVG, slotScopeIds, optimized) => {
          let el;
          let vnodeHook;
          const { type, props, shapeFlag, transition, patchFlag, dirs } = vnode;
          {
              el = vnode.el = hostCreateElement(vnode.type, isSVG, props && props.is, props);
              // mount children first, since some props may rely on child content
              // being already rendered, e.g. `<select value>`
              if (shapeFlag & 8 /* TEXT_CHILDREN */) {
                  hostSetElementText(el, vnode.children);
              }
              else if (shapeFlag & 16 /* ARRAY_CHILDREN */) {
                  mountChildren(vnode.children, el, null, parentComponent, parentSuspense, isSVG && type !== 'foreignObject', slotScopeIds, optimized || !!vnode.dynamicChildren);
              }
              if (dirs) {
                  invokeDirectiveHook(vnode, null, parentComponent, 'created');
              }
              // props
              if (props) {
                  for (const key in props) {
                      if (!isReservedProp(key)) {
                          hostPatchProp(el, key, null, props[key], isSVG, vnode.children, parentComponent, parentSuspense, unmountChildren);
                      }
                  }
                  if ((vnodeHook = props.onVnodeBeforeMount)) {
                      invokeVNodeHook(vnodeHook, parentComponent, vnode);
                  }
              }
              // scopeId
              setScopeId(el, vnode, vnode.scopeId, slotScopeIds, parentComponent);
          }
          {
              Object.defineProperty(el, '__vnode', {
                  value: vnode,
                  enumerable: false
              });
              Object.defineProperty(el, '__vueParentComponent', {
                  value: parentComponent,
                  enumerable: false
              });
          }
          if (dirs) {
              invokeDirectiveHook(vnode, null, parentComponent, 'beforeMount');
          }
          // #1583 For inside suspense + suspense not resolved case, enter hook should call when suspense resolved
          // #1689 For inside suspense + suspense resolved case, just call it
          const needCallTransitionHooks = (!parentSuspense || (parentSuspense && !parentSuspense.pendingBranch)) &&
              transition &&
              !transition.persisted;
          if (needCallTransitionHooks) {
              transition.beforeEnter(el);
          }
          hostInsert(el, container, anchor);
          if ((vnodeHook = props && props.onVnodeMounted) ||
              needCallTransitionHooks ||
              dirs) {
              queuePostRenderEffect(() => {
                  vnodeHook && invokeVNodeHook(vnodeHook, parentComponent, vnode);
                  needCallTransitionHooks && transition.enter(el);
                  dirs && invokeDirectiveHook(vnode, null, parentComponent, 'mounted');
              }, parentSuspense);
          }
      };
      const setScopeId = (el, vnode, scopeId, slotScopeIds, parentComponent) => {
          if (scopeId) {
              hostSetScopeId(el, scopeId);
          }
          if (slotScopeIds) {
              for (let i = 0; i < slotScopeIds.length; i++) {
                  hostSetScopeId(el, slotScopeIds[i]);
              }
          }
          if (parentComponent) {
              let subTree = parentComponent.subTree;
              if (subTree.patchFlag > 0 &&
                  subTree.patchFlag & 2048 /* DEV_ROOT_FRAGMENT */) {
                  subTree =
                      filterSingleRoot(subTree.children) || subTree;
              }
              if (vnode === subTree) {
                  const parentVNode = parentComponent.vnode;
                  setScopeId(el, parentVNode, parentVNode.scopeId, parentVNode.slotScopeIds, parentComponent.parent);
              }
          }
      };
      const mountChildren = (children, container, anchor, parentComponent, parentSuspense, isSVG, optimized, slotScopeIds, start = 0) => {
          for (let i = start; i < children.length; i++) {
              const child = (children[i] = optimized
                  ? cloneIfMounted(children[i])
                  : normalizeVNode(children[i]));
              patch(null, child, container, anchor, parentComponent, parentSuspense, isSVG, optimized, slotScopeIds);
          }
      };
      const patchElement = (n1, n2, parentComponent, parentSuspense, isSVG, slotScopeIds, optimized) => {
          const el = (n2.el = n1.el);
          let { patchFlag, dynamicChildren, dirs } = n2;
          // #1426 take the old vnode's patch flag into account since user may clone a
          // compiler-generated vnode, which de-opts to FULL_PROPS
          patchFlag |= n1.patchFlag & 16 /* FULL_PROPS */;
          const oldProps = n1.props || EMPTY_OBJ;
          const newProps = n2.props || EMPTY_OBJ;
          let vnodeHook;
          if ((vnodeHook = newProps.onVnodeBeforeUpdate)) {
              invokeVNodeHook(vnodeHook, parentComponent, n2, n1);
          }
          if (dirs) {
              invokeDirectiveHook(n2, n1, parentComponent, 'beforeUpdate');
          }
          if (isHmrUpdating) {
              // HMR updated, force full diff
              patchFlag = 0;
              optimized = false;
              dynamicChildren = null;
          }
          if (patchFlag > 0) {
              // the presence of a patchFlag means this element's render code was
              // generated by the compiler and can take the fast path.
              // in this path old node and new node are guaranteed to have the same shape
              // (i.e. at the exact same position in the source template)
              if (patchFlag & 16 /* FULL_PROPS */) {
                  // element props contain dynamic keys, full diff needed
                  patchProps(el, n2, oldProps, newProps, parentComponent, parentSuspense, isSVG);
              }
              else {
                  // class
                  // this flag is matched when the element has dynamic class bindings.
                  if (patchFlag & 2 /* CLASS */) {
                      if (oldProps.class !== newProps.class) {
                          hostPatchProp(el, 'class', null, newProps.class, isSVG);
                      }
                  }
                  // style
                  // this flag is matched when the element has dynamic style bindings
                  if (patchFlag & 4 /* STYLE */) {
                      hostPatchProp(el, 'style', oldProps.style, newProps.style, isSVG);
                  }
                  // props
                  // This flag is matched when the element has dynamic prop/attr bindings
                  // other than class and style. The keys of dynamic prop/attrs are saved for
                  // faster iteration.
                  // Note dynamic keys like :[foo]="bar" will cause this optimization to
                  // bail out and go through a full diff because we need to unset the old key
                  if (patchFlag & 8 /* PROPS */) {
                      // if the flag is present then dynamicProps must be non-null
                      const propsToUpdate = n2.dynamicProps;
                      for (let i = 0; i < propsToUpdate.length; i++) {
                          const key = propsToUpdate[i];
                          const prev = oldProps[key];
                          const next = newProps[key];
                          if (next !== prev ||
                              (hostForcePatchProp && hostForcePatchProp(el, key))) {
                              hostPatchProp(el, key, prev, next, isSVG, n1.children, parentComponent, parentSuspense, unmountChildren);
                          }
                      }
                  }
              }
              // text
              // This flag is matched when the element has only dynamic text children.
              if (patchFlag & 1 /* TEXT */) {
                  if (n1.children !== n2.children) {
                      hostSetElementText(el, n2.children);
                  }
              }
          }
          else if (!optimized && dynamicChildren == null) {
              // unoptimized, full diff
              patchProps(el, n2, oldProps, newProps, parentComponent, parentSuspense, isSVG);
          }
          const areChildrenSVG = isSVG && n2.type !== 'foreignObject';
          if (dynamicChildren) {
              patchBlockChildren(n1.dynamicChildren, dynamicChildren, el, parentComponent, parentSuspense, areChildrenSVG, slotScopeIds);
              if (parentComponent && parentComponent.type.__hmrId) {
                  traverseStaticChildren(n1, n2);
              }
          }
          else if (!optimized) {
              // full diff
              patchChildren(n1, n2, el, null, parentComponent, parentSuspense, areChildrenSVG, slotScopeIds, false);
          }
          if ((vnodeHook = newProps.onVnodeUpdated) || dirs) {
              queuePostRenderEffect(() => {
                  vnodeHook && invokeVNodeHook(vnodeHook, parentComponent, n2, n1);
                  dirs && invokeDirectiveHook(n2, n1, parentComponent, 'updated');
              }, parentSuspense);
          }
      };
      // The fast path for blocks.
      const patchBlockChildren = (oldChildren, newChildren, fallbackContainer, parentComponent, parentSuspense, isSVG, slotScopeIds) => {
          for (let i = 0; i < newChildren.length; i++) {
              const oldVNode = oldChildren[i];
              const newVNode = newChildren[i];
              // Determine the container (parent element) for the patch.
              const container = 
              // - In the case of a Fragment, we need to provide the actual parent
              // of the Fragment itself so it can move its children.
              oldVNode.type === Fragment ||
                  // - In the case of different nodes, there is going to be a replacement
                  // which also requires the correct parent container
                  !isSameVNodeType(oldVNode, newVNode) ||
                  // - In the case of a component, it could contain anything.
                  oldVNode.shapeFlag & 6 /* COMPONENT */ ||
                  oldVNode.shapeFlag & 64 /* TELEPORT */
                  ? hostParentNode(oldVNode.el)
                  : // In other cases, the parent container is not actually used so we
                      // just pass the block element here to avoid a DOM parentNode call.
                      fallbackContainer;
              patch(oldVNode, newVNode, container, null, parentComponent, parentSuspense, isSVG, slotScopeIds, true);
          }
      };
      const patchProps = (el, vnode, oldProps, newProps, parentComponent, parentSuspense, isSVG) => {
          if (oldProps !== newProps) {
              for (const key in newProps) {
                  // empty string is not valid prop
                  if (isReservedProp(key))
                      continue;
                  const next = newProps[key];
                  const prev = oldProps[key];
                  if (next !== prev ||
                      (hostForcePatchProp && hostForcePatchProp(el, key))) {
                      hostPatchProp(el, key, prev, next, isSVG, vnode.children, parentComponent, parentSuspense, unmountChildren);
                  }
              }
              if (oldProps !== EMPTY_OBJ) {
                  for (const key in oldProps) {
                      if (!isReservedProp(key) && !(key in newProps)) {
                          hostPatchProp(el, key, oldProps[key], null, isSVG, vnode.children, parentComponent, parentSuspense, unmountChildren);
                      }
                  }
              }
          }
      };
      const processFragment = (n1, n2, container, anchor, parentComponent, parentSuspense, isSVG, slotScopeIds, optimized) => {
          const fragmentStartAnchor = (n2.el = n1 ? n1.el : hostCreateText(''));
          const fragmentEndAnchor = (n2.anchor = n1 ? n1.anchor : hostCreateText(''));
          let { patchFlag, dynamicChildren, slotScopeIds: fragmentSlotScopeIds } = n2;
          if (patchFlag > 0) {
              optimized = true;
          }
          // check if this is a slot fragment with :slotted scope ids
          if (fragmentSlotScopeIds) {
              slotScopeIds = slotScopeIds
                  ? slotScopeIds.concat(fragmentSlotScopeIds)
                  : fragmentSlotScopeIds;
          }
          if (isHmrUpdating) {
              // HMR updated, force full diff
              patchFlag = 0;
              optimized = false;
              dynamicChildren = null;
          }
          if (n1 == null) {
              hostInsert(fragmentStartAnchor, container, anchor);
              hostInsert(fragmentEndAnchor, container, anchor);
              // a fragment can only have array children
              // since they are either generated by the compiler, or implicitly created
              // from arrays.
              mountChildren(n2.children, container, fragmentEndAnchor, parentComponent, parentSuspense, isSVG, slotScopeIds, optimized);
          }
          else {
              if (patchFlag > 0 &&
                  patchFlag & 64 /* STABLE_FRAGMENT */ &&
                  dynamicChildren &&
                  // #2715 the previous fragment could've been a BAILed one as a result
                  // of renderSlot() with no valid children
                  n1.dynamicChildren) {
                  // a stable fragment (template root or <template v-for>) doesn't need to
                  // patch children order, but it may contain dynamicChildren.
                  patchBlockChildren(n1.dynamicChildren, dynamicChildren, container, parentComponent, parentSuspense, isSVG, slotScopeIds);
                  if (parentComponent && parentComponent.type.__hmrId) {
                      traverseStaticChildren(n1, n2);
                  }
                  else if (
                  // #2080 if the stable fragment has a key, it's a <template v-for> that may
                  //  get moved around. Make sure all root level vnodes inherit el.
                  // #2134 or if it's a component root, it may also get moved around
                  // as the component is being moved.
                  n2.key != null ||
                      (parentComponent && n2 === parentComponent.subTree)) {
                      traverseStaticChildren(n1, n2, true /* shallow */);
                  }
              }
              else {
                  // keyed / unkeyed, or manual fragments.
                  // for keyed & unkeyed, since they are compiler generated from v-for,
                  // each child is guaranteed to be a block so the fragment will never
                  // have dynamicChildren.
                  patchChildren(n1, n2, container, fragmentEndAnchor, parentComponent, parentSuspense, isSVG, slotScopeIds, optimized);
              }
          }
      };
      const processComponent = (n1, n2, container, anchor, parentComponent, parentSuspense, isSVG, slotScopeIds, optimized) => {
          n2.slotScopeIds = slotScopeIds;
          if (n1 == null) {
              if (n2.shapeFlag & 512 /* COMPONENT_KEPT_ALIVE */) {
                  parentComponent.ctx.activate(n2, container, anchor, isSVG, optimized);
              }
              else {
                  mountComponent(n2, container, anchor, parentComponent, parentSuspense, isSVG, optimized);
              }
          }
          else {
              updateComponent(n1, n2, optimized);
          }
      };
      const mountComponent = (initialVNode, container, anchor, parentComponent, parentSuspense, isSVG, optimized) => {
          const instance = (initialVNode.component = createComponentInstance(initialVNode, parentComponent, parentSuspense));
          if (instance.type.__hmrId) {
              registerHMR(instance);
          }
          {
              pushWarningContext(initialVNode);
              startMeasure(instance, `mount`);
          }
          // inject renderer internals for keepAlive
          if (isKeepAlive(initialVNode)) {
              instance.ctx.renderer = internals;
          }
          // resolve props and slots for setup context
          {
              startMeasure(instance, `init`);
          }
          setupComponent(instance);
          {
              endMeasure(instance, `init`);
          }
          // setup() is async. This component relies on async logic to be resolved
          // before proceeding
          if (instance.asyncDep) {
              parentSuspense && parentSuspense.registerDep(instance, setupRenderEffect);
              // Give it a placeholder if this is not hydration
              // TODO handle self-defined fallback
              if (!initialVNode.el) {
                  const placeholder = (instance.subTree = createVNode(Comment));
                  processCommentNode(null, placeholder, container, anchor);
              }
              return;
          }
          setupRenderEffect(instance, initialVNode, container, anchor, parentSuspense, isSVG, optimized);
          {
              popWarningContext();
              endMeasure(instance, `mount`);
          }
      };
      const updateComponent = (n1, n2, optimized) => {
          const instance = (n2.component = n1.component);
          if (shouldUpdateComponent(n1, n2, optimized)) {
              if (instance.asyncDep &&
                  !instance.asyncResolved) {
                  // async & still pending - just update props and slots
                  // since the component's reactive effect for render isn't set-up yet
                  {
                      pushWarningContext(n2);
                  }
                  updateComponentPreRender(instance, n2, optimized);
                  {
                      popWarningContext();
                  }
                  return;
              }
              else {
                  // normal update
                  instance.next = n2;
                  // in case the child component is also queued, remove it to avoid
                  // double updating the same child component in the same flush.
                  invalidateJob(instance.update);
                  // instance.update is the reactive effect runner.
                  instance.update();
              }
          }
          else {
              // no update needed. just copy over properties
              n2.component = n1.component;
              n2.el = n1.el;
              instance.vnode = n2;
          }
      };
      const setupRenderEffect = (instance, initialVNode, container, anchor, parentSuspense, isSVG, optimized) => {
          // create reactive effect for rendering
          instance.update = effect(function componentEffect() {
              if (!instance.isMounted) {
                  let vnodeHook;
                  const { el, props } = initialVNode;
                  const { bm, m, parent } = instance;
                  // beforeMount hook
                  if (bm) {
                      invokeArrayFns(bm);
                  }
                  // onVnodeBeforeMount
                  if ((vnodeHook = props && props.onVnodeBeforeMount)) {
                      invokeVNodeHook(vnodeHook, parent, initialVNode);
                  }
                  // render
                  {
                      startMeasure(instance, `render`);
                  }
                  const subTree = (instance.subTree = renderComponentRoot(instance));
                  {
                      endMeasure(instance, `render`);
                  }
                  if (el && hydrateNode) {
                      {
                          startMeasure(instance, `hydrate`);
                      }
                      // vnode has adopted host node - perform hydration instead of mount.
                      hydrateNode(initialVNode.el, subTree, instance, parentSuspense, null);
                      {
                          endMeasure(instance, `hydrate`);
                      }
                  }
                  else {
                      {
                          startMeasure(instance, `patch`);
                      }
                      patch(null, subTree, container, anchor, instance, parentSuspense, isSVG);
                      {
                          endMeasure(instance, `patch`);
                      }
                      initialVNode.el = subTree.el;
                  }
                  // mounted hook
                  if (m) {
                      queuePostRenderEffect(m, parentSuspense);
                  }
                  // onVnodeMounted
                  if ((vnodeHook = props && props.onVnodeMounted)) {
                      const scopedInitialVNode = initialVNode;
                      queuePostRenderEffect(() => {
                          invokeVNodeHook(vnodeHook, parent, scopedInitialVNode);
                      }, parentSuspense);
                  }
                  // activated hook for keep-alive roots.
                  // #1742 activated hook must be accessed after first render
                  // since the hook may be injected by a child keep-alive
                  const { a } = instance;
                  if (a &&
                      initialVNode.shapeFlag & 256 /* COMPONENT_SHOULD_KEEP_ALIVE */) {
                      queuePostRenderEffect(a, parentSuspense);
                  }
                  instance.isMounted = true;
                  {
                      devtoolsComponentAdded(instance);
                  }
                  // #2458: deference mount-only object parameters to prevent memleaks
                  initialVNode = container = anchor = null;
              }
              else {
                  // updateComponent
                  // This is triggered by mutation of component's own state (next: null)
                  // OR parent calling processComponent (next: VNode)
                  let { next, bu, u, parent, vnode } = instance;
                  let originNext = next;
                  let vnodeHook;
                  {
                      pushWarningContext(next || instance.vnode);
                  }
                  if (next) {
                      next.el = vnode.el;
                      updateComponentPreRender(instance, next, optimized);
                  }
                  else {
                      next = vnode;
                  }
                  // beforeUpdate hook
                  if (bu) {
                      invokeArrayFns(bu);
                  }
                  // onVnodeBeforeUpdate
                  if ((vnodeHook = next.props && next.props.onVnodeBeforeUpdate)) {
                      invokeVNodeHook(vnodeHook, parent, next, vnode);
                  }
                  // render
                  {
                      startMeasure(instance, `render`);
                  }
                  const nextTree = renderComponentRoot(instance);
                  {
                      endMeasure(instance, `render`);
                  }
                  const prevTree = instance.subTree;
                  instance.subTree = nextTree;
                  {
                      startMeasure(instance, `patch`);
                  }
                  patch(prevTree, nextTree, 
                  // parent may have changed if it's in a teleport
                  hostParentNode(prevTree.el), 
                  // anchor may have changed if it's in a fragment
                  getNextHostNode(prevTree), instance, parentSuspense, isSVG);
                  {
                      endMeasure(instance, `patch`);
                  }
                  next.el = nextTree.el;
                  if (originNext === null) {
                      // self-triggered update. In case of HOC, update parent component
                      // vnode el. HOC is indicated by parent instance's subTree pointing
                      // to child component's vnode
                      updateHOCHostEl(instance, nextTree.el);
                  }
                  // updated hook
                  if (u) {
                      queuePostRenderEffect(u, parentSuspense);
                  }
                  // onVnodeUpdated
                  if ((vnodeHook = next.props && next.props.onVnodeUpdated)) {
                      queuePostRenderEffect(() => {
                          invokeVNodeHook(vnodeHook, parent, next, vnode);
                      }, parentSuspense);
                  }
                  {
                      devtoolsComponentUpdated(instance);
                  }
                  {
                      popWarningContext();
                  }
              }
          }, createDevEffectOptions(instance) );
      };
      const updateComponentPreRender = (instance, nextVNode, optimized) => {
          nextVNode.component = instance;
          const prevProps = instance.vnode.props;
          instance.vnode = nextVNode;
          instance.next = null;
          updateProps(instance, nextVNode.props, prevProps, optimized);
          updateSlots(instance, nextVNode.children, optimized);
          pauseTracking();
          // props update may have triggered pre-flush watchers.
          // flush them before the render update.
          flushPreFlushCbs(undefined, instance.update);
          resetTracking();
      };
      const patchChildren = (n1, n2, container, anchor, parentComponent, parentSuspense, isSVG, slotScopeIds, optimized = false) => {
          const c1 = n1 && n1.children;
          const prevShapeFlag = n1 ? n1.shapeFlag : 0;
          const c2 = n2.children;
          const { patchFlag, shapeFlag } = n2;
          // fast path
          if (patchFlag > 0) {
              if (patchFlag & 128 /* KEYED_FRAGMENT */) {
                  // this could be either fully-keyed or mixed (some keyed some not)
                  // presence of patchFlag means children are guaranteed to be arrays
                  patchKeyedChildren(c1, c2, container, anchor, parentComponent, parentSuspense, isSVG, slotScopeIds, optimized);
                  return;
              }
              else if (patchFlag & 256 /* UNKEYED_FRAGMENT */) {
                  // unkeyed
                  patchUnkeyedChildren(c1, c2, container, anchor, parentComponent, parentSuspense, isSVG, slotScopeIds, optimized);
                  return;
              }
          }
          // children has 3 possibilities: text, array or no children.
          if (shapeFlag & 8 /* TEXT_CHILDREN */) {
              // text children fast path
              if (prevShapeFlag & 16 /* ARRAY_CHILDREN */) {
                  unmountChildren(c1, parentComponent, parentSuspense);
              }
              if (c2 !== c1) {
                  hostSetElementText(container, c2);
              }
          }
          else {
              if (prevShapeFlag & 16 /* ARRAY_CHILDREN */) {
                  // prev children was array
                  if (shapeFlag & 16 /* ARRAY_CHILDREN */) {
                      // two arrays, cannot assume anything, do full diff
                      patchKeyedChildren(c1, c2, container, anchor, parentComponent, parentSuspense, isSVG, slotScopeIds, optimized);
                  }
                  else {
                      // no new children, just unmount old
                      unmountChildren(c1, parentComponent, parentSuspense, true);
                  }
              }
              else {
                  // prev children was text OR null
                  // new children is array OR null
                  if (prevShapeFlag & 8 /* TEXT_CHILDREN */) {
                      hostSetElementText(container, '');
                  }
                  // mount new if array
                  if (shapeFlag & 16 /* ARRAY_CHILDREN */) {
                      mountChildren(c2, container, anchor, parentComponent, parentSuspense, isSVG, slotScopeIds, optimized);
                  }
              }
          }
      };
      const patchUnkeyedChildren = (c1, c2, container, anchor, parentComponent, parentSuspense, isSVG, slotScopeIds, optimized) => {
          c1 = c1 || EMPTY_ARR;
          c2 = c2 || EMPTY_ARR;
          const oldLength = c1.length;
          const newLength = c2.length;
          const commonLength = Math.min(oldLength, newLength);
          let i;
          for (i = 0; i < commonLength; i++) {
              const nextChild = (c2[i] = optimized
                  ? cloneIfMounted(c2[i])
                  : normalizeVNode(c2[i]));
              patch(c1[i], nextChild, container, null, parentComponent, parentSuspense, isSVG, slotScopeIds, optimized);
          }
          if (oldLength > newLength) {
              // remove old
              unmountChildren(c1, parentComponent, parentSuspense, true, false, commonLength);
          }
          else {
              // mount new
              mountChildren(c2, container, anchor, parentComponent, parentSuspense, isSVG, slotScopeIds, optimized, commonLength);
          }
      };
      // can be all-keyed or mixed
      const patchKeyedChildren = (c1, c2, container, parentAnchor, parentComponent, parentSuspense, isSVG, slotScopeIds, optimized) => {
          let i = 0;
          const l2 = c2.length;
          let e1 = c1.length - 1; // prev ending index
          let e2 = l2 - 1; // next ending index
          // 1. sync from start
          // (a b) c
          // (a b) d e
          while (i <= e1 && i <= e2) {
              const n1 = c1[i];
              const n2 = (c2[i] = optimized
                  ? cloneIfMounted(c2[i])
                  : normalizeVNode(c2[i]));
              if (isSameVNodeType(n1, n2)) {
                  patch(n1, n2, container, null, parentComponent, parentSuspense, isSVG, slotScopeIds, optimized);
              }
              else {
                  break;
              }
              i++;
          }
          // 2. sync from end
          // a (b c)
          // d e (b c)
          while (i <= e1 && i <= e2) {
              const n1 = c1[e1];
              const n2 = (c2[e2] = optimized
                  ? cloneIfMounted(c2[e2])
                  : normalizeVNode(c2[e2]));
              if (isSameVNodeType(n1, n2)) {
                  patch(n1, n2, container, null, parentComponent, parentSuspense, isSVG, slotScopeIds, optimized);
              }
              else {
                  break;
              }
              e1--;
              e2--;
          }
          // 3. common sequence + mount
          // (a b)
          // (a b) c
          // i = 2, e1 = 1, e2 = 2
          // (a b)
          // c (a b)
          // i = 0, e1 = -1, e2 = 0
          if (i > e1) {
              if (i <= e2) {
                  const nextPos = e2 + 1;
                  const anchor = nextPos < l2 ? c2[nextPos].el : parentAnchor;
                  while (i <= e2) {
                      patch(null, (c2[i] = optimized
                          ? cloneIfMounted(c2[i])
                          : normalizeVNode(c2[i])), container, anchor, parentComponent, parentSuspense, isSVG, slotScopeIds, optimized);
                      i++;
                  }
              }
          }
          // 4. common sequence + unmount
          // (a b) c
          // (a b)
          // i = 2, e1 = 2, e2 = 1
          // a (b c)
          // (b c)
          // i = 0, e1 = 0, e2 = -1
          else if (i > e2) {
              while (i <= e1) {
                  unmount(c1[i], parentComponent, parentSuspense, true);
                  i++;
              }
          }
          // 5. unknown sequence
          // [i ... e1 + 1]: a b [c d e] f g
          // [i ... e2 + 1]: a b [e d c h] f g
          // i = 2, e1 = 4, e2 = 5
          else {
              const s1 = i; // prev starting index
              const s2 = i; // next starting index
              // 5.1 build key:index map for newChildren
              const keyToNewIndexMap = new Map();
              for (i = s2; i <= e2; i++) {
                  const nextChild = (c2[i] = optimized
                      ? cloneIfMounted(c2[i])
                      : normalizeVNode(c2[i]));
                  if (nextChild.key != null) {
                      if (keyToNewIndexMap.has(nextChild.key)) {
                          warn(`Duplicate keys found during update:`, JSON.stringify(nextChild.key), `Make sure keys are unique.`);
                      }
                      keyToNewIndexMap.set(nextChild.key, i);
                  }
              }
              // 5.2 loop through old children left to be patched and try to patch
              // matching nodes & remove nodes that are no longer present
              let j;
              let patched = 0;
              const toBePatched = e2 - s2 + 1;
              let moved = false;
              // used to track whether any node has moved
              let maxNewIndexSoFar = 0;
              // works as Map<newIndex, oldIndex>
              // Note that oldIndex is offset by +1
              // and oldIndex = 0 is a special value indicating the new node has
              // no corresponding old node.
              // used for determining longest stable subsequence
              const newIndexToOldIndexMap = new Array(toBePatched);
              for (i = 0; i < toBePatched; i++)
                  newIndexToOldIndexMap[i] = 0;
              for (i = s1; i <= e1; i++) {
                  const prevChild = c1[i];
                  if (patched >= toBePatched) {
                      // all new children have been patched so this can only be a removal
                      unmount(prevChild, parentComponent, parentSuspense, true);
                      continue;
                  }
                  let newIndex;
                  if (prevChild.key != null) {
                      newIndex = keyToNewIndexMap.get(prevChild.key);
                  }
                  else {
                      // key-less node, try to locate a key-less node of the same type
                      for (j = s2; j <= e2; j++) {
                          if (newIndexToOldIndexMap[j - s2] === 0 &&
                              isSameVNodeType(prevChild, c2[j])) {
                              newIndex = j;
                              break;
                          }
                      }
                  }
                  if (newIndex === undefined) {
                      unmount(prevChild, parentComponent, parentSuspense, true);
                  }
                  else {
                      newIndexToOldIndexMap[newIndex - s2] = i + 1;
                      if (newIndex >= maxNewIndexSoFar) {
                          maxNewIndexSoFar = newIndex;
                      }
                      else {
                          moved = true;
                      }
                      patch(prevChild, c2[newIndex], container, null, parentComponent, parentSuspense, isSVG, slotScopeIds, optimized);
                      patched++;
                  }
              }
              // 5.3 move and mount
              // generate longest stable subsequence only when nodes have moved
              const increasingNewIndexSequence = moved
                  ? getSequence(newIndexToOldIndexMap)
                  : EMPTY_ARR;
              j = increasingNewIndexSequence.length - 1;
              // looping backwards so that we can use last patched node as anchor
              for (i = toBePatched - 1; i >= 0; i--) {
                  const nextIndex = s2 + i;
                  const nextChild = c2[nextIndex];
                  const anchor = nextIndex + 1 < l2 ? c2[nextIndex + 1].el : parentAnchor;
                  if (newIndexToOldIndexMap[i] === 0) {
                      // mount new
                      patch(null, nextChild, container, anchor, parentComponent, parentSuspense, isSVG, slotScopeIds, optimized);
                  }
                  else if (moved) {
                      // move if:
                      // There is no stable subsequence (e.g. a reverse)
                      // OR current node is not among the stable sequence
                      if (j < 0 || i !== increasingNewIndexSequence[j]) {
                          move(nextChild, container, anchor, 2 /* REORDER */);
                      }
                      else {
                          j--;
                      }
                  }
              }
          }
      };
      const move = (vnode, container, anchor, moveType, parentSuspense = null) => {
          const { el, type, transition, children, shapeFlag } = vnode;
          if (shapeFlag & 6 /* COMPONENT */) {
              move(vnode.component.subTree, container, anchor, moveType);
              return;
          }
          if (shapeFlag & 128 /* SUSPENSE */) {
              vnode.suspense.move(container, anchor, moveType);
              return;
          }
          if (shapeFlag & 64 /* TELEPORT */) {
              type.move(vnode, container, anchor, internals);
              return;
          }
          if (type === Fragment) {
              hostInsert(el, container, anchor);
              for (let i = 0; i < children.length; i++) {
                  move(children[i], container, anchor, moveType);
              }
              hostInsert(vnode.anchor, container, anchor);
              return;
          }
          if (type === Static) {
              moveStaticNode(vnode, container, anchor);
              return;
          }
          // single nodes
          const needTransition = moveType !== 2 /* REORDER */ &&
              shapeFlag & 1 /* ELEMENT */ &&
              transition;
          if (needTransition) {
              if (moveType === 0 /* ENTER */) {
                  transition.beforeEnter(el);
                  hostInsert(el, container, anchor);
                  queuePostRenderEffect(() => transition.enter(el), parentSuspense);
              }
              else {
                  const { leave, delayLeave, afterLeave } = transition;
                  const remove = () => hostInsert(el, container, anchor);
                  const performLeave = () => {
                      leave(el, () => {
                          remove();
                          afterLeave && afterLeave();
                      });
                  };
                  if (delayLeave) {
                      delayLeave(el, remove, performLeave);
                  }
                  else {
                      performLeave();
                  }
              }
          }
          else {
              hostInsert(el, container, anchor);
          }
      };
      const unmount = (vnode, parentComponent, parentSuspense, doRemove = false, optimized = false) => {
          const { type, props, ref, children, dynamicChildren, shapeFlag, patchFlag, dirs } = vnode;
          // unset ref
          if (ref != null) {
              setRef(ref, null, parentSuspense, null);
          }
          if (shapeFlag & 256 /* COMPONENT_SHOULD_KEEP_ALIVE */) {
              parentComponent.ctx.deactivate(vnode);
              return;
          }
          const shouldInvokeDirs = shapeFlag & 1 /* ELEMENT */ && dirs;
          let vnodeHook;
          if ((vnodeHook = props && props.onVnodeBeforeUnmount)) {
              invokeVNodeHook(vnodeHook, parentComponent, vnode);
          }
          if (shapeFlag & 6 /* COMPONENT */) {
              unmountComponent(vnode.component, parentSuspense, doRemove);
          }
          else {
              if (shapeFlag & 128 /* SUSPENSE */) {
                  vnode.suspense.unmount(parentSuspense, doRemove);
                  return;
              }
              if (shouldInvokeDirs) {
                  invokeDirectiveHook(vnode, null, parentComponent, 'beforeUnmount');
              }
              if (shapeFlag & 64 /* TELEPORT */) {
                  vnode.type.remove(vnode, parentComponent, parentSuspense, optimized, internals, doRemove);
              }
              else if (dynamicChildren &&
                  // #1153: fast path should not be taken for non-stable (v-for) fragments
                  (type !== Fragment ||
                      (patchFlag > 0 && patchFlag & 64 /* STABLE_FRAGMENT */))) {
                  // fast path for block nodes: only need to unmount dynamic children.
                  unmountChildren(dynamicChildren, parentComponent, parentSuspense, false, true);
              }
              else if ((type === Fragment &&
                  (patchFlag & 128 /* KEYED_FRAGMENT */ ||
                      patchFlag & 256 /* UNKEYED_FRAGMENT */)) ||
                  (!optimized && shapeFlag & 16 /* ARRAY_CHILDREN */)) {
                  unmountChildren(children, parentComponent, parentSuspense);
              }
              if (doRemove) {
                  remove(vnode);
              }
          }
          if ((vnodeHook = props && props.onVnodeUnmounted) || shouldInvokeDirs) {
              queuePostRenderEffect(() => {
                  vnodeHook && invokeVNodeHook(vnodeHook, parentComponent, vnode);
                  shouldInvokeDirs &&
                      invokeDirectiveHook(vnode, null, parentComponent, 'unmounted');
              }, parentSuspense);
          }
      };
      const remove = vnode => {
          const { type, el, anchor, transition } = vnode;
          if (type === Fragment) {
              removeFragment(el, anchor);
              return;
          }
          if (type === Static) {
              removeStaticNode(vnode);
              return;
          }
          const performRemove = () => {
              hostRemove(el);
              if (transition && !transition.persisted && transition.afterLeave) {
                  transition.afterLeave();
              }
          };
          if (vnode.shapeFlag & 1 /* ELEMENT */ &&
              transition &&
              !transition.persisted) {
              const { leave, delayLeave } = transition;
              const performLeave = () => leave(el, performRemove);
              if (delayLeave) {
                  delayLeave(vnode.el, performRemove, performLeave);
              }
              else {
                  performLeave();
              }
          }
          else {
              performRemove();
          }
      };
      const removeFragment = (cur, end) => {
          // For fragments, directly remove all contained DOM nodes.
          // (fragment child nodes cannot have transition)
          let next;
          while (cur !== end) {
              next = hostNextSibling(cur);
              hostRemove(cur);
              cur = next;
          }
          hostRemove(end);
      };
      const unmountComponent = (instance, parentSuspense, doRemove) => {
          if (instance.type.__hmrId) {
              unregisterHMR(instance);
          }
          const { bum, effects, update, subTree, um } = instance;
          // beforeUnmount hook
          if (bum) {
              invokeArrayFns(bum);
          }
          if (effects) {
              for (let i = 0; i < effects.length; i++) {
                  stop(effects[i]);
              }
          }
          // update may be null if a component is unmounted before its async
          // setup has resolved.
          if (update) {
              stop(update);
              unmount(subTree, instance, parentSuspense, doRemove);
          }
          // unmounted hook
          if (um) {
              queuePostRenderEffect(um, parentSuspense);
          }
          queuePostRenderEffect(() => {
              instance.isUnmounted = true;
          }, parentSuspense);
          // A component with async dep inside a pending suspense is unmounted before
          // its async dep resolves. This should remove the dep from the suspense, and
          // cause the suspense to resolve immediately if that was the last dep.
          if (parentSuspense &&
              parentSuspense.pendingBranch &&
              !parentSuspense.isUnmounted &&
              instance.asyncDep &&
              !instance.asyncResolved &&
              instance.suspenseId === parentSuspense.pendingId) {
              parentSuspense.deps--;
              if (parentSuspense.deps === 0) {
                  parentSuspense.resolve();
              }
          }
          {
              devtoolsComponentRemoved(instance);
          }
      };
      const unmountChildren = (children, parentComponent, parentSuspense, doRemove = false, optimized = false, start = 0) => {
          for (let i = start; i < children.length; i++) {
              unmount(children[i], parentComponent, parentSuspense, doRemove, optimized);
          }
      };
      const getNextHostNode = vnode => {
          if (vnode.shapeFlag & 6 /* COMPONENT */) {
              return getNextHostNode(vnode.component.subTree);
          }
          if (vnode.shapeFlag & 128 /* SUSPENSE */) {
              return vnode.suspense.next();
          }
          return hostNextSibling((vnode.anchor || vnode.el));
      };
      const render = (vnode, container, isSVG) => {
          if (vnode == null) {
              if (container._vnode) {
                  unmount(container._vnode, null, null, true);
              }
          }
          else {
              patch(container._vnode || null, vnode, container, null, null, null, isSVG);
          }
          flushPostFlushCbs();
          container._vnode = vnode;
      };
      const internals = {
          p: patch,
          um: unmount,
          m: move,
          r: remove,
          mt: mountComponent,
          mc: mountChildren,
          pc: patchChildren,
          pbc: patchBlockChildren,
          n: getNextHostNode,
          o: options
      };
      let hydrate;
      let hydrateNode;
      if (createHydrationFns) {
          [hydrate, hydrateNode] = createHydrationFns(internals);
      }
      return {
          render,
          hydrate,
          createApp: createAppAPI(render, hydrate)
      };
  }
  function invokeVNodeHook(hook, instance, vnode, prevVNode = null) {
      callWithAsyncErrorHandling(hook, instance, 7 /* VNODE_HOOK */, [
          vnode,
          prevVNode
      ]);
  }
  /**
   * #1156
   * When a component is HMR-enabled, we need to make sure that all static nodes
   * inside a block also inherit the DOM element from the previous tree so that
   * HMR updates (which are full updates) can retrieve the element for patching.
   *
   * #2080
   * Inside keyed `template` fragment static children, if a fragment is moved,
   * the children will always moved so that need inherit el form previous nodes
   * to ensure correct moved position.
   */
  function traverseStaticChildren(n1, n2, shallow = false) {
      const ch1 = n1.children;
      const ch2 = n2.children;
      if (isArray(ch1) && isArray(ch2)) {
          for (let i = 0; i < ch1.length; i++) {
              // this is only called in the optimized path so array children are
              // guaranteed to be vnodes
              const c1 = ch1[i];
              let c2 = ch2[i];
              if (c2.shapeFlag & 1 /* ELEMENT */ && !c2.dynamicChildren) {
                  if (c2.patchFlag <= 0 || c2.patchFlag === 32 /* HYDRATE_EVENTS */) {
                      c2 = ch2[i] = cloneIfMounted(ch2[i]);
                      c2.el = c1.el;
                  }
                  if (!shallow)
                      traverseStaticChildren(c1, c2);
              }
              // also inherit for comment nodes, but not placeholders (e.g. v-if which
              // would have received .el during block patch)
              if (c2.type === Comment && !c2.el) {
                  c2.el = c1.el;
              }
          }
      }
  }
  // https://en.wikipedia.org/wiki/Longest_increasing_subsequence
  function getSequence(arr) {
      const p = arr.slice();
      const result = [0];
      let i, j, u, v, c;
      const len = arr.length;
      for (i = 0; i < len; i++) {
          const arrI = arr[i];
          if (arrI !== 0) {
              j = result[result.length - 1];
              if (arr[j] < arrI) {
                  p[i] = j;
                  result.push(i);
                  continue;
              }
              u = 0;
              v = result.length - 1;
              while (u < v) {
                  c = ((u + v) / 2) | 0;
                  if (arr[result[c]] < arrI) {
                      u = c + 1;
                  }
                  else {
                      v = c;
                  }
              }
              if (arrI < arr[result[u]]) {
                  if (u > 0) {
                      p[i] = result[u - 1];
                  }
                  result[u] = i;
              }
          }
      }
      u = result.length;
      v = result[u - 1];
      while (u-- > 0) {
          result[u] = v;
          v = p[v];
      }
      return result;
  }

  const isTeleport = (type) => type.__isTeleport;
  const isTeleportDisabled = (props) => props && (props.disabled || props.disabled === '');
  const isTargetSVG = (target) => typeof SVGElement !== 'undefined' && target instanceof SVGElement;
  const resolveTarget = (props, select) => {
      const targetSelector = props && props.to;
      if (isString(targetSelector)) {
          if (!select) {
              warn(`Current renderer does not support string target for Teleports. ` +
                      `(missing querySelector renderer option)`);
              return null;
          }
          else {
              const target = select(targetSelector);
              if (!target) {
                  warn(`Failed to locate Teleport target with selector "${targetSelector}". ` +
                          `Note the target element must exist before the component is mounted - ` +
                          `i.e. the target cannot be rendered by the component itself, and ` +
                          `ideally should be outside of the entire Vue component tree.`);
              }
              return target;
          }
      }
      else {
          if (!targetSelector && !isTeleportDisabled(props)) {
              warn(`Invalid Teleport target: ${targetSelector}`);
          }
          return targetSelector;
      }
  };
  const TeleportImpl = {
      __isTeleport: true,
      process(n1, n2, container, anchor, parentComponent, parentSuspense, isSVG, slotScopeIds, optimized, internals) {
          const { mc: mountChildren, pc: patchChildren, pbc: patchBlockChildren, o: { insert, querySelector, createText, createComment } } = internals;
          const disabled = isTeleportDisabled(n2.props);
          const { shapeFlag, children } = n2;
          // #3302
          // HMR updated, force full diff
          if (isHmrUpdating) {
              optimized = false;
              n2.dynamicChildren = null;
          }
          if (n1 == null) {
              // insert anchors in the main view
              const placeholder = (n2.el = createComment('teleport start')
                  );
              const mainAnchor = (n2.anchor = createComment('teleport end')
                  );
              insert(placeholder, container, anchor);
              insert(mainAnchor, container, anchor);
              const target = (n2.target = resolveTarget(n2.props, querySelector));
              const targetAnchor = (n2.targetAnchor = createText(''));
              if (target) {
                  insert(targetAnchor, target);
                  // #2652 we could be teleporting from a non-SVG tree into an SVG tree
                  isSVG = isSVG || isTargetSVG(target);
              }
              else if (!disabled) {
                  warn('Invalid Teleport target on mount:', target, `(${typeof target})`);
              }
              const mount = (container, anchor) => {
                  // Teleport *always* has Array children. This is enforced in both the
                  // compiler and vnode children normalization.
                  if (shapeFlag & 16 /* ARRAY_CHILDREN */) {
                      mountChildren(children, container, anchor, parentComponent, parentSuspense, isSVG, slotScopeIds, optimized);
                  }
              };
              if (disabled) {
                  mount(container, mainAnchor);
              }
              else if (target) {
                  mount(target, targetAnchor);
              }
          }
          else {
              // update content
              n2.el = n1.el;
              const mainAnchor = (n2.anchor = n1.anchor);
              const target = (n2.target = n1.target);
              const targetAnchor = (n2.targetAnchor = n1.targetAnchor);
              const wasDisabled = isTeleportDisabled(n1.props);
              const currentContainer = wasDisabled ? container : target;
              const currentAnchor = wasDisabled ? mainAnchor : targetAnchor;
              isSVG = isSVG || isTargetSVG(target);
              if (n2.dynamicChildren) {
                  // fast path when the teleport happens to be a block root
                  patchBlockChildren(n1.dynamicChildren, n2.dynamicChildren, currentContainer, parentComponent, parentSuspense, isSVG, slotScopeIds);
                  // even in block tree mode we need to make sure all root-level nodes
                  // in the teleport inherit previous DOM references so that they can
                  // be moved in future patches.
                  traverseStaticChildren(n1, n2, true);
              }
              else if (!optimized) {
                  patchChildren(n1, n2, currentContainer, currentAnchor, parentComponent, parentSuspense, isSVG, slotScopeIds, false);
              }
              if (disabled) {
                  if (!wasDisabled) {
                      // enabled -> disabled
                      // move into main container
                      moveTeleport(n2, container, mainAnchor, internals, 1 /* TOGGLE */);
                  }
              }
              else {
                  // target changed
                  if ((n2.props && n2.props.to) !== (n1.props && n1.props.to)) {
                      const nextTarget = (n2.target = resolveTarget(n2.props, querySelector));
                      if (nextTarget) {
                          moveTeleport(n2, nextTarget, null, internals, 0 /* TARGET_CHANGE */);
                      }
                      else {
                          warn('Invalid Teleport target on update:', target, `(${typeof target})`);
                      }
                  }
                  else if (wasDisabled) {
                      // disabled -> enabled
                      // move into teleport target
                      moveTeleport(n2, target, targetAnchor, internals, 1 /* TOGGLE */);
                  }
              }
          }
      },
      remove(vnode, parentComponent, parentSuspense, optimized, { um: unmount, o: { remove: hostRemove } }, doRemove) {
          const { shapeFlag, children, anchor, targetAnchor, target, props } = vnode;
          if (target) {
              hostRemove(targetAnchor);
          }
          // an unmounted teleport should always remove its children if not disabled
          if (doRemove || !isTeleportDisabled(props)) {
              hostRemove(anchor);
              if (shapeFlag & 16 /* ARRAY_CHILDREN */) {
                  for (let i = 0; i < children.length; i++) {
                      unmount(children[i], parentComponent, parentSuspense, true, optimized);
                  }
              }
          }
      },
      move: moveTeleport,
      hydrate: hydrateTeleport
  };
  function moveTeleport(vnode, container, parentAnchor, { o: { insert }, m: move }, moveType = 2 /* REORDER */) {
      // move target anchor if this is a target change.
      if (moveType === 0 /* TARGET_CHANGE */) {
          insert(vnode.targetAnchor, container, parentAnchor);
      }
      const { el, anchor, shapeFlag, children, props } = vnode;
      const isReorder = moveType === 2 /* REORDER */;
      // move main view anchor if this is a re-order.
      if (isReorder) {
          insert(el, container, parentAnchor);
      }
      // if this is a re-order and teleport is enabled (content is in target)
      // do not move children. So the opposite is: only move children if this
      // is not a reorder, or the teleport is disabled
      if (!isReorder || isTeleportDisabled(props)) {
          // Teleport has either Array children or no children.
          if (shapeFlag & 16 /* ARRAY_CHILDREN */) {
              for (let i = 0; i < children.length; i++) {
                  move(children[i], container, parentAnchor, 2 /* REORDER */);
              }
          }
      }
      // move main view anchor if this is a re-order.
      if (isReorder) {
          insert(anchor, container, parentAnchor);
      }
  }
  function hydrateTeleport(node, vnode, parentComponent, parentSuspense, slotScopeIds, optimized, { o: { nextSibling, parentNode, querySelector } }, hydrateChildren) {
      const target = (vnode.target = resolveTarget(vnode.props, querySelector));
      if (target) {
          // if multiple teleports rendered to the same target element, we need to
          // pick up from where the last teleport finished instead of the first node
          const targetNode = target._lpa || target.firstChild;
          if (vnode.shapeFlag & 16 /* ARRAY_CHILDREN */) {
              if (isTeleportDisabled(vnode.props)) {
                  vnode.anchor = hydrateChildren(nextSibling(node), vnode, parentNode(node), parentComponent, parentSuspense, slotScopeIds, optimized);
                  vnode.targetAnchor = targetNode;
              }
              else {
                  vnode.anchor = nextSibling(node);
                  vnode.targetAnchor = hydrateChildren(targetNode, vnode, target, parentComponent, parentSuspense, slotScopeIds, optimized);
              }
              target._lpa =
                  vnode.targetAnchor && nextSibling(vnode.targetAnchor);
          }
      }
      return vnode.anchor && nextSibling(vnode.anchor);
  }
  // Force-casted public typing for h and TSX props inference
  const Teleport = TeleportImpl;

  const COMPONENTS = 'components';
  const DIRECTIVES = 'directives';
  /**
   * @private
   */
  function resolveComponent(name, maybeSelfReference) {
      return resolveAsset(COMPONENTS, name, true, maybeSelfReference) || name;
  }
  const NULL_DYNAMIC_COMPONENT = Symbol();
  /**
   * @private
   */
  function resolveDynamicComponent(component) {
      if (isString(component)) {
          return resolveAsset(COMPONENTS, component, false) || component;
      }
      else {
          // invalid types will fallthrough to createVNode and raise warning
          return (component || NULL_DYNAMIC_COMPONENT);
      }
  }
  /**
   * @private
   */
  function resolveDirective(name) {
      return resolveAsset(DIRECTIVES, name);
  }
  // implementation
  function resolveAsset(type, name, warnMissing = true, maybeSelfReference = false) {
      const instance = currentRenderingInstance || currentInstance;
      if (instance) {
          const Component = instance.type;
          // explicit self name has highest priority
          if (type === COMPONENTS) {
              const selfName = getComponentName(Component);
              if (selfName &&
                  (selfName === name ||
                      selfName === camelize(name) ||
                      selfName === capitalize(camelize(name)))) {
                  return Component;
              }
          }
          const res = 
          // local registration
          // check instance[type] first for components with mixin or extends.
          resolve(instance[type] || Component[type], name) ||
              // global registration
              resolve(instance.appContext[type], name);
          if (!res && maybeSelfReference) {
              // fallback to implicit self-reference
              return Component;
          }
          if (warnMissing && !res) {
              warn(`Failed to resolve ${type.slice(0, -1)}: ${name}`);
          }
          return res;
      }
      else {
          warn(`resolve${capitalize(type.slice(0, -1))} ` +
              `can only be used in render() or setup().`);
      }
  }
  function resolve(registry, name) {
      return (registry &&
          (registry[name] ||
              registry[camelize(name)] ||
              registry[capitalize(camelize(name))]));
  }

  const Fragment = Symbol('Fragment' );
  const Text = Symbol('Text' );
  const Comment = Symbol('Comment' );
  const Static = Symbol('Static' );
  // Since v-if and v-for are the two possible ways node structure can dynamically
  // change, once we consider v-if branches and each v-for fragment a block, we
  // can divide a template into nested blocks, and within each block the node
  // structure would be stable. This allows us to skip most children diffing
  // and only worry about the dynamic nodes (indicated by patch flags).
  const blockStack = [];
  let currentBlock = null;
  /**
   * Open a block.
   * This must be called before `createBlock`. It cannot be part of `createBlock`
   * because the children of the block are evaluated before `createBlock` itself
   * is called. The generated code typically looks like this:
   *
   * ```js
   * function render() {
   *   return (openBlock(),createBlock('div', null, [...]))
   * }
   * ```
   * disableTracking is true when creating a v-for fragment block, since a v-for
   * fragment always diffs its children.
   *
   * @private
   */
  function openBlock(disableTracking = false) {
      blockStack.push((currentBlock = disableTracking ? null : []));
  }
  function closeBlock() {
      blockStack.pop();
      currentBlock = blockStack[blockStack.length - 1] || null;
  }
  // Whether we should be tracking dynamic child nodes inside a block.
  // Only tracks when this value is > 0
  // We are not using a simple boolean because this value may need to be
  // incremented/decremented by nested usage of v-once (see below)
  let shouldTrack$1 = 1;
  /**
   * Block tracking sometimes needs to be disabled, for example during the
   * creation of a tree that needs to be cached by v-once. The compiler generates
   * code like this:
   *
   * ``` js
   * _cache[1] || (
   *   setBlockTracking(-1),
   *   _cache[1] = createVNode(...),
   *   setBlockTracking(1),
   *   _cache[1]
   * )
   * ```
   *
   * @private
   */
  function setBlockTracking(value) {
      shouldTrack$1 += value;
  }
  /**
   * Create a block root vnode. Takes the same exact arguments as `createVNode`.
   * A block root keeps track of dynamic nodes within the block in the
   * `dynamicChildren` array.
   *
   * @private
   */
  function createBlock(type, props, children, patchFlag, dynamicProps) {
      const vnode = createVNode(type, props, children, patchFlag, dynamicProps, true /* isBlock: prevent a block from tracking itself */);
      // save current block children on the block vnode
      vnode.dynamicChildren = currentBlock || EMPTY_ARR;
      // close block
      closeBlock();
      // a block is always going to be patched, so track it as a child of its
      // parent block
      if (shouldTrack$1 > 0 && currentBlock) {
          currentBlock.push(vnode);
      }
      return vnode;
  }
  function isVNode(value) {
      return value ? value.__v_isVNode === true : false;
  }
  function isSameVNodeType(n1, n2) {
      if (n2.shapeFlag & 6 /* COMPONENT */ &&
          hmrDirtyComponents.has(n2.type)) {
          // HMR only: if the component has been hot-updated, force a reload.
          return false;
      }
      return n1.type === n2.type && n1.key === n2.key;
  }
  let vnodeArgsTransformer;
  /**
   * Internal API for registering an arguments transform for createVNode
   * used for creating stubs in the test-utils
   * It is *internal* but needs to be exposed for test-utils to pick up proper
   * typings
   */
  function transformVNodeArgs(transformer) {
      vnodeArgsTransformer = transformer;
  }
  const createVNodeWithArgsTransform = (...args) => {
      return _createVNode(...(vnodeArgsTransformer
          ? vnodeArgsTransformer(args, currentRenderingInstance)
          : args));
  };
  const InternalObjectKey = `__vInternal`;
  const normalizeKey = ({ key }) => key != null ? key : null;
  const normalizeRef = ({ ref }) => {
      return (ref != null
          ? isString(ref) || isRef(ref) || isFunction(ref)
              ? { i: currentRenderingInstance, r: ref }
              : ref
          : null);
  };
  const createVNode = (createVNodeWithArgsTransform
      );
  function _createVNode(type, props = null, children = null, patchFlag = 0, dynamicProps = null, isBlockNode = false) {
      if (!type || type === NULL_DYNAMIC_COMPONENT) {
          if (!type) {
              warn(`Invalid vnode type when creating vnode: ${type}.`);
          }
          type = Comment;
      }
      if (isVNode(type)) {
          // createVNode receiving an existing vnode. This happens in cases like
          // <component :is="vnode"/>
          // #2078 make sure to merge refs during the clone instead of overwriting it
          const cloned = cloneVNode(type, props, true /* mergeRef: true */);
          if (children) {
              normalizeChildren(cloned, children);
          }
          return cloned;
      }
      // class component normalization.
      if (isClassComponent(type)) {
          type = type.__vccOpts;
      }
      // class & style normalization.
      if (props) {
          // for reactive or proxy objects, we need to clone it to enable mutation.
          if (isProxy(props) || InternalObjectKey in props) {
              props = extend({}, props);
          }
          let { class: klass, style } = props;
          if (klass && !isString(klass)) {
              props.class = normalizeClass(klass);
          }
          if (isObject(style)) {
              // reactive state objects need to be cloned since they are likely to be
              // mutated
              if (isProxy(style) && !isArray(style)) {
                  style = extend({}, style);
              }
              props.style = normalizeStyle(style);
          }
      }
      // encode the vnode type information into a bitmap
      const shapeFlag = isString(type)
          ? 1 /* ELEMENT */
          : isSuspense(type)
              ? 128 /* SUSPENSE */
              : isTeleport(type)
                  ? 64 /* TELEPORT */
                  : isObject(type)
                      ? 4 /* STATEFUL_COMPONENT */
                      : isFunction(type)
                          ? 2 /* FUNCTIONAL_COMPONENT */
                          : 0;
      if (shapeFlag & 4 /* STATEFUL_COMPONENT */ && isProxy(type)) {
          type = toRaw(type);
          warn(`Vue received a Component which was made a reactive object. This can ` +
              `lead to unnecessary performance overhead, and should be avoided by ` +
              `marking the component with \`markRaw\` or using \`shallowRef\` ` +
              `instead of \`ref\`.`, `\nComponent that was made reactive: `, type);
      }
      const vnode = {
          __v_isVNode: true,
          ["__v_skip" /* SKIP */]: true,
          type,
          props,
          key: props && normalizeKey(props),
          ref: props && normalizeRef(props),
          scopeId: currentScopeId,
          slotScopeIds: null,
          children: null,
          component: null,
          suspense: null,
          ssContent: null,
          ssFallback: null,
          dirs: null,
          transition: null,
          el: null,
          anchor: null,
          target: null,
          targetAnchor: null,
          staticCount: 0,
          shapeFlag,
          patchFlag,
          dynamicProps,
          dynamicChildren: null,
          appContext: null
      };
      // validate key
      if (vnode.key !== vnode.key) {
          warn(`VNode created with invalid key (NaN). VNode type:`, vnode.type);
      }
      normalizeChildren(vnode, children);
      // normalize suspense children
      if (shapeFlag & 128 /* SUSPENSE */) {
          const { content, fallback } = normalizeSuspenseChildren(vnode);
          vnode.ssContent = content;
          vnode.ssFallback = fallback;
      }
      if (shouldTrack$1 > 0 &&
          // avoid a block node from tracking itself
          !isBlockNode &&
          // has current parent block
          currentBlock &&
          // presence of a patch flag indicates this node needs patching on updates.
          // component nodes also should always be patched, because even if the
          // component doesn't need to update, it needs to persist the instance on to
          // the next vnode so that it can be properly unmounted later.
          (patchFlag > 0 || shapeFlag & 6 /* COMPONENT */) &&
          // the EVENTS flag is only for hydration and if it is the only flag, the
          // vnode should not be considered dynamic due to handler caching.
          patchFlag !== 32 /* HYDRATE_EVENTS */) {
          currentBlock.push(vnode);
      }
      return vnode;
  }
  function cloneVNode(vnode, extraProps, mergeRef = false) {
      // This is intentionally NOT using spread or extend to avoid the runtime
      // key enumeration cost.
      const { props, ref, patchFlag, children } = vnode;
      const mergedProps = extraProps ? mergeProps(props || {}, extraProps) : props;
      return {
          __v_isVNode: true,
          ["__v_skip" /* SKIP */]: true,
          type: vnode.type,
          props: mergedProps,
          key: mergedProps && normalizeKey(mergedProps),
          ref: extraProps && extraProps.ref
              ? // #2078 in the case of <component :is="vnode" ref="extra"/>
                  // if the vnode itself already has a ref, cloneVNode will need to merge
                  // the refs so the single vnode can be set on multiple refs
                  mergeRef && ref
                      ? isArray(ref)
                          ? ref.concat(normalizeRef(extraProps))
                          : [ref, normalizeRef(extraProps)]
                      : normalizeRef(extraProps)
              : ref,
          scopeId: vnode.scopeId,
          slotScopeIds: vnode.slotScopeIds,
          children: patchFlag === -1 /* HOISTED */ && isArray(children)
              ? children.map(deepCloneVNode)
              : children,
          target: vnode.target,
          targetAnchor: vnode.targetAnchor,
          staticCount: vnode.staticCount,
          shapeFlag: vnode.shapeFlag,
          // if the vnode is cloned with extra props, we can no longer assume its
          // existing patch flag to be reliable and need to add the FULL_PROPS flag.
          // note: perserve flag for fragments since they use the flag for children
          // fast paths only.
          patchFlag: extraProps && vnode.type !== Fragment
              ? patchFlag === -1 // hoisted node
                  ? 16 /* FULL_PROPS */
                  : patchFlag | 16 /* FULL_PROPS */
              : patchFlag,
          dynamicProps: vnode.dynamicProps,
          dynamicChildren: vnode.dynamicChildren,
          appContext: vnode.appContext,
          dirs: vnode.dirs,
          transition: vnode.transition,
          // These should technically only be non-null on mounted VNodes. However,
          // they *should* be copied for kept-alive vnodes. So we just always copy
          // them since them being non-null during a mount doesn't affect the logic as
          // they will simply be overwritten.
          component: vnode.component,
          suspense: vnode.suspense,
          ssContent: vnode.ssContent && cloneVNode(vnode.ssContent),
          ssFallback: vnode.ssFallback && cloneVNode(vnode.ssFallback),
          el: vnode.el,
          anchor: vnode.anchor
      };
  }
  /**
   * Dev only, for HMR of hoisted vnodes reused in v-for
   * https://github.com/vitejs/vite/issues/2022
   */
  function deepCloneVNode(vnode) {
      const cloned = cloneVNode(vnode);
      if (isArray(vnode.children)) {
          cloned.children = vnode.children.map(deepCloneVNode);
      }
      return cloned;
  }
  /**
   * @private
   */
  function createTextVNode(text = ' ', flag = 0) {
      return createVNode(Text, null, text, flag);
  }
  /**
   * @private
   */
  function createStaticVNode(content, numberOfNodes) {
      // A static vnode can contain multiple stringified elements, and the number
      // of elements is necessary for hydration.
      const vnode = createVNode(Static, null, content);
      vnode.staticCount = numberOfNodes;
      return vnode;
  }
  /**
   * @private
   */
  function createCommentVNode(text = '', 
  // when used as the v-else branch, the comment node must be created as a
  // block to ensure correct updates.
  asBlock = false) {
      return asBlock
          ? (openBlock(), createBlock(Comment, null, text))
          : createVNode(Comment, null, text);
  }
  function normalizeVNode(child) {
      if (child == null || typeof child === 'boolean') {
          // empty placeholder
          return createVNode(Comment);
      }
      else if (isArray(child)) {
          // fragment
          return createVNode(Fragment, null, child);
      }
      else if (typeof child === 'object') {
          // already vnode, this should be the most common since compiled templates
          // always produce all-vnode children arrays
          return child.el === null ? child : cloneVNode(child);
      }
      else {
          // strings and numbers
          return createVNode(Text, null, String(child));
      }
  }
  // optimized normalization for template-compiled render fns
  function cloneIfMounted(child) {
      return child.el === null ? child : cloneVNode(child);
  }
  function normalizeChildren(vnode, children) {
      let type = 0;
      const { shapeFlag } = vnode;
      if (children == null) {
          children = null;
      }
      else if (isArray(children)) {
          type = 16 /* ARRAY_CHILDREN */;
      }
      else if (typeof children === 'object') {
          if (shapeFlag & 1 /* ELEMENT */ || shapeFlag & 64 /* TELEPORT */) {
              // Normalize slot to plain children for plain element and Teleport
              const slot = children.default;
              if (slot) {
                  // _c marker is added by withCtx() indicating this is a compiled slot
                  slot._c && setCompiledSlotRendering(1);
                  normalizeChildren(vnode, slot());
                  slot._c && setCompiledSlotRendering(-1);
              }
              return;
          }
          else {
              type = 32 /* SLOTS_CHILDREN */;
              const slotFlag = children._;
              if (!slotFlag && !(InternalObjectKey in children)) {
                  children._ctx = currentRenderingInstance;
              }
              else if (slotFlag === 3 /* FORWARDED */ && currentRenderingInstance) {
                  // a child component receives forwarded slots from the parent.
                  // its slot type is determined by its parent's slot type.
                  if (currentRenderingInstance.vnode.patchFlag & 1024 /* DYNAMIC_SLOTS */) {
                      children._ = 2 /* DYNAMIC */;
                      vnode.patchFlag |= 1024 /* DYNAMIC_SLOTS */;
                  }
                  else {
                      children._ = 1 /* STABLE */;
                  }
              }
          }
      }
      else if (isFunction(children)) {
          children = { default: children, _ctx: currentRenderingInstance };
          type = 32 /* SLOTS_CHILDREN */;
      }
      else {
          children = String(children);
          // force teleport children to array so it can be moved around
          if (shapeFlag & 64 /* TELEPORT */) {
              type = 16 /* ARRAY_CHILDREN */;
              children = [createTextVNode(children)];
          }
          else {
              type = 8 /* TEXT_CHILDREN */;
          }
      }
      vnode.children = children;
      vnode.shapeFlag |= type;
  }
  function mergeProps(...args) {
      const ret = extend({}, args[0]);
      for (let i = 1; i < args.length; i++) {
          const toMerge = args[i];
          for (const key in toMerge) {
              if (key === 'class') {
                  if (ret.class !== toMerge.class) {
                      ret.class = normalizeClass([ret.class, toMerge.class]);
                  }
              }
              else if (key === 'style') {
                  ret.style = normalizeStyle([ret.style, toMerge.style]);
              }
              else if (isOn(key)) {
                  const existing = ret[key];
                  const incoming = toMerge[key];
                  if (existing !== incoming) {
                      ret[key] = existing
                          ? [].concat(existing, toMerge[key])
                          : incoming;
                  }
              }
              else if (key !== '') {
                  ret[key] = toMerge[key];
              }
          }
      }
      return ret;
  }

  function provide(key, value) {
      if (!currentInstance) {
          {
              warn(`provide() can only be used inside setup().`);
          }
      }
      else {
          let provides = currentInstance.provides;
          // by default an instance inherits its parent's provides object
          // but when it needs to provide values of its own, it creates its
          // own provides object using parent provides object as prototype.
          // this way in `inject` we can simply look up injections from direct
          // parent and let the prototype chain do the work.
          const parentProvides = currentInstance.parent && currentInstance.parent.provides;
          if (parentProvides === provides) {
              provides = currentInstance.provides = Object.create(parentProvides);
          }
          // TS doesn't allow symbol as index type
          provides[key] = value;
      }
  }
  function inject(key, defaultValue, treatDefaultAsFactory = false) {
      // fallback to `currentRenderingInstance` so that this can be called in
      // a functional component
      const instance = currentInstance || currentRenderingInstance;
      if (instance) {
          // #2400
          // to support `app.use` plugins,
          // fallback to appContext's `provides` if the intance is at root
          const provides = instance.parent == null
              ? instance.vnode.appContext && instance.vnode.appContext.provides
              : instance.parent.provides;
          if (provides && key in provides) {
              // TS doesn't allow symbol as index type
              return provides[key];
          }
          else if (arguments.length > 1) {
              return treatDefaultAsFactory && isFunction(defaultValue)
                  ? defaultValue()
                  : defaultValue;
          }
          else {
              warn(`injection "${String(key)}" not found.`);
          }
      }
      else {
          warn(`inject() can only be used inside setup() or functional components.`);
      }
  }

  function createDuplicateChecker() {
      const cache = Object.create(null);
      return (type, key) => {
          if (cache[key]) {
              warn(`${type} property "${key}" is already defined in ${cache[key]}.`);
          }
          else {
              cache[key] = type;
          }
      };
  }
  let shouldCacheAccess = true;
  function applyOptions(instance, options, deferredData = [], deferredWatch = [], deferredProvide = [], asMixin = false) {
      const { 
      // composition
      mixins, extends: extendsOptions, 
      // state
      data: dataOptions, computed: computedOptions, methods, watch: watchOptions, provide: provideOptions, inject: injectOptions, 
      // assets
      components, directives, 
      // lifecycle
      beforeMount, mounted, beforeUpdate, updated, activated, deactivated, beforeDestroy, beforeUnmount, destroyed, unmounted, render, renderTracked, renderTriggered, errorCaptured, 
      // public API
      expose } = options;
      const publicThis = instance.proxy;
      const ctx = instance.ctx;
      const globalMixins = instance.appContext.mixins;
      if (asMixin && render && instance.render === NOOP) {
          instance.render = render;
      }
      // applyOptions is called non-as-mixin once per instance
      if (!asMixin) {
          shouldCacheAccess = false;
          callSyncHook('beforeCreate', "bc" /* BEFORE_CREATE */, options, instance, globalMixins);
          shouldCacheAccess = true;
          // global mixins are applied first
          applyMixins(instance, globalMixins, deferredData, deferredWatch, deferredProvide);
      }
      // extending a base component...
      if (extendsOptions) {
          applyOptions(instance, extendsOptions, deferredData, deferredWatch, deferredProvide, true);
      }
      // local mixins
      if (mixins) {
          applyMixins(instance, mixins, deferredData, deferredWatch, deferredProvide);
      }
      const checkDuplicateProperties = createDuplicateChecker() ;
      {
          const [propsOptions] = instance.propsOptions;
          if (propsOptions) {
              for (const key in propsOptions) {
                  checkDuplicateProperties("Props" /* PROPS */, key);
              }
          }
      }
      // options initialization order (to be consistent with Vue 2):
      // - props (already done outside of this function)
      // - inject
      // - methods
      // - data (deferred since it relies on `this` access)
      // - computed
      // - watch (deferred since it relies on `this` access)
      if (injectOptions) {
          if (isArray(injectOptions)) {
              for (let i = 0; i < injectOptions.length; i++) {
                  const key = injectOptions[i];
                  ctx[key] = inject(key);
                  {
                      checkDuplicateProperties("Inject" /* INJECT */, key);
                  }
              }
          }
          else {
              for (const key in injectOptions) {
                  const opt = injectOptions[key];
                  if (isObject(opt)) {
                      ctx[key] = inject(opt.from || key, opt.default, true /* treat default function as factory */);
                  }
                  else {
                      ctx[key] = inject(opt);
                  }
                  {
                      checkDuplicateProperties("Inject" /* INJECT */, key);
                  }
              }
          }
      }
      if (methods) {
          for (const key in methods) {
              const methodHandler = methods[key];
              if (isFunction(methodHandler)) {
                  // In dev mode, we use the `createRenderContext` function to define methods to the proxy target,
                  // and those are read-only but reconfigurable, so it needs to be redefined here
                  {
                      Object.defineProperty(ctx, key, {
                          value: methodHandler.bind(publicThis),
                          configurable: true,
                          enumerable: true,
                          writable: true
                      });
                  }
                  {
                      checkDuplicateProperties("Methods" /* METHODS */, key);
                  }
              }
              else {
                  warn(`Method "${key}" has type "${typeof methodHandler}" in the component definition. ` +
                      `Did you reference the function correctly?`);
              }
          }
      }
      if (!asMixin) {
          if (deferredData.length) {
              deferredData.forEach(dataFn => resolveData(instance, dataFn, publicThis));
          }
          if (dataOptions) {
              // @ts-ignore dataOptions is not fully type safe
              resolveData(instance, dataOptions, publicThis);
          }
          {
              const rawData = toRaw(instance.data);
              for (const key in rawData) {
                  checkDuplicateProperties("Data" /* DATA */, key);
                  // expose data on ctx during dev
                  if (key[0] !== '$' && key[0] !== '_') {
                      Object.defineProperty(ctx, key, {
                          configurable: true,
                          enumerable: true,
                          get: () => rawData[key],
                          set: NOOP
                      });
                  }
              }
          }
      }
      else if (dataOptions) {
          deferredData.push(dataOptions);
      }
      if (computedOptions) {
          for (const key in computedOptions) {
              const opt = computedOptions[key];
              const get = isFunction(opt)
                  ? opt.bind(publicThis, publicThis)
                  : isFunction(opt.get)
                      ? opt.get.bind(publicThis, publicThis)
                      : NOOP;
              if (get === NOOP) {
                  warn(`Computed property "${key}" has no getter.`);
              }
              const set = !isFunction(opt) && isFunction(opt.set)
                  ? opt.set.bind(publicThis)
                  : () => {
                          warn(`Write operation failed: computed property "${key}" is readonly.`);
                      }
                      ;
              const c = computed$1({
                  get,
                  set
              });
              Object.defineProperty(ctx, key, {
                  enumerable: true,
                  configurable: true,
                  get: () => c.value,
                  set: v => (c.value = v)
              });
              {
                  checkDuplicateProperties("Computed" /* COMPUTED */, key);
              }
          }
      }
      if (watchOptions) {
          deferredWatch.push(watchOptions);
      }
      if (!asMixin && deferredWatch.length) {
          deferredWatch.forEach(watchOptions => {
              for (const key in watchOptions) {
                  createWatcher(watchOptions[key], ctx, publicThis, key);
              }
          });
      }
      if (provideOptions) {
          deferredProvide.push(provideOptions);
      }
      if (!asMixin && deferredProvide.length) {
          deferredProvide.forEach(provideOptions => {
              const provides = isFunction(provideOptions)
                  ? provideOptions.call(publicThis)
                  : provideOptions;
              Reflect.ownKeys(provides).forEach(key => {
                  provide(key, provides[key]);
              });
          });
      }
      // asset options.
      // To reduce memory usage, only components with mixins or extends will have
      // resolved asset registry attached to instance.
      if (asMixin) {
          if (components) {
              extend(instance.components ||
                  (instance.components = extend({}, instance.type.components)), components);
          }
          if (directives) {
              extend(instance.directives ||
                  (instance.directives = extend({}, instance.type.directives)), directives);
          }
      }
      // lifecycle options
      if (!asMixin) {
          callSyncHook('created', "c" /* CREATED */, options, instance, globalMixins);
      }
      if (beforeMount) {
          onBeforeMount(beforeMount.bind(publicThis));
      }
      if (mounted) {
          onMounted(mounted.bind(publicThis));
      }
      if (beforeUpdate) {
          onBeforeUpdate(beforeUpdate.bind(publicThis));
      }
      if (updated) {
          onUpdated(updated.bind(publicThis));
      }
      if (activated) {
          onActivated(activated.bind(publicThis));
      }
      if (deactivated) {
          onDeactivated(deactivated.bind(publicThis));
      }
      if (errorCaptured) {
          onErrorCaptured(errorCaptured.bind(publicThis));
      }
      if (renderTracked) {
          onRenderTracked(renderTracked.bind(publicThis));
      }
      if (renderTriggered) {
          onRenderTriggered(renderTriggered.bind(publicThis));
      }
      if (beforeDestroy) {
          warn(`\`beforeDestroy\` has been renamed to \`beforeUnmount\`.`);
      }
      if (beforeUnmount) {
          onBeforeUnmount(beforeUnmount.bind(publicThis));
      }
      if (destroyed) {
          warn(`\`destroyed\` has been renamed to \`unmounted\`.`);
      }
      if (unmounted) {
          onUnmounted(unmounted.bind(publicThis));
      }
      if (isArray(expose)) {
          if (!asMixin) {
              if (expose.length) {
                  const exposed = instance.exposed || (instance.exposed = proxyRefs({}));
                  expose.forEach(key => {
                      exposed[key] = toRef(publicThis, key);
                  });
              }
              else if (!instance.exposed) {
                  instance.exposed = EMPTY_OBJ;
              }
          }
          else {
              warn(`The \`expose\` option is ignored when used in mixins.`);
          }
      }
  }
  function callSyncHook(name, type, options, instance, globalMixins) {
      for (let i = 0; i < globalMixins.length; i++) {
          callHookWithMixinAndExtends(name, type, globalMixins[i], instance);
      }
      callHookWithMixinAndExtends(name, type, options, instance);
  }
  function callHookWithMixinAndExtends(name, type, options, instance) {
      const { extends: base, mixins } = options;
      const selfHook = options[name];
      if (base) {
          callHookWithMixinAndExtends(name, type, base, instance);
      }
      if (mixins) {
          for (let i = 0; i < mixins.length; i++) {
              callHookWithMixinAndExtends(name, type, mixins[i], instance);
          }
      }
      if (selfHook) {
          callWithAsyncErrorHandling(selfHook.bind(instance.proxy), instance, type);
      }
  }
  function applyMixins(instance, mixins, deferredData, deferredWatch, deferredProvide) {
      for (let i = 0; i < mixins.length; i++) {
          applyOptions(instance, mixins[i], deferredData, deferredWatch, deferredProvide, true);
      }
  }
  function resolveData(instance, dataFn, publicThis) {
      if (!isFunction(dataFn)) {
          warn(`The data option must be a function. ` +
              `Plain object usage is no longer supported.`);
      }
      shouldCacheAccess = false;
      const data = dataFn.call(publicThis, publicThis);
      shouldCacheAccess = true;
      if (isPromise(data)) {
          warn(`data() returned a Promise - note data() cannot be async; If you ` +
              `intend to perform data fetching before component renders, use ` +
              `async setup() + <Suspense>.`);
      }
      if (!isObject(data)) {
          warn(`data() should return an object.`);
      }
      else if (instance.data === EMPTY_OBJ) {
          instance.data = reactive(data);
      }
      else {
          // existing data: this is a mixin or extends.
          extend(instance.data, data);
      }
  }
  function createWatcher(raw, ctx, publicThis, key) {
      const getter = key.includes('.')
          ? createPathGetter(publicThis, key)
          : () => publicThis[key];
      if (isString(raw)) {
          const handler = ctx[raw];
          if (isFunction(handler)) {
              watch(getter, handler);
          }
          else {
              warn(`Invalid watch handler specified by key "${raw}"`, handler);
          }
      }
      else if (isFunction(raw)) {
          watch(getter, raw.bind(publicThis));
      }
      else if (isObject(raw)) {
          if (isArray(raw)) {
              raw.forEach(r => createWatcher(r, ctx, publicThis, key));
          }
          else {
              const handler = isFunction(raw.handler)
                  ? raw.handler.bind(publicThis)
                  : ctx[raw.handler];
              if (isFunction(handler)) {
                  watch(getter, handler, raw);
              }
              else {
                  warn(`Invalid watch handler specified by key "${raw.handler}"`, handler);
              }
          }
      }
      else {
          warn(`Invalid watch option: "${key}"`, raw);
      }
  }
  function createPathGetter(ctx, path) {
      const segments = path.split('.');
      return () => {
          let cur = ctx;
          for (let i = 0; i < segments.length && cur; i++) {
              cur = cur[segments[i]];
          }
          return cur;
      };
  }
  function resolveMergedOptions(instance) {
      const raw = instance.type;
      const { __merged, mixins, extends: extendsOptions } = raw;
      if (__merged)
          return __merged;
      const globalMixins = instance.appContext.mixins;
      if (!globalMixins.length && !mixins && !extendsOptions)
          return raw;
      const options = {};
      globalMixins.forEach(m => mergeOptions(options, m, instance));
      mergeOptions(options, raw, instance);
      return (raw.__merged = options);
  }
  function mergeOptions(to, from, instance) {
      const strats = instance.appContext.config.optionMergeStrategies;
      const { mixins, extends: extendsOptions } = from;
      extendsOptions && mergeOptions(to, extendsOptions, instance);
      mixins &&
          mixins.forEach((m) => mergeOptions(to, m, instance));
      for (const key in from) {
          if (strats && hasOwn(strats, key)) {
              to[key] = strats[key](to[key], from[key], instance.proxy, key);
          }
          else {
              to[key] = from[key];
          }
      }
  }

  /**
   * #2437 In Vue 3, functional components do not have a public instance proxy but
   * they exist in the internal parent chain. For code that relies on traversing
   * public $parent chains, skip functional ones and go to the parent instead.
   */
  const getPublicInstance = (i) => {
      if (!i)
          return null;
      if (isStatefulComponent(i))
          return i.exposed ? i.exposed : i.proxy;
      return getPublicInstance(i.parent);
  };
  const publicPropertiesMap = extend(Object.create(null), {
      $: i => i,
      $el: i => i.vnode.el,
      $data: i => i.data,
      $props: i => (shallowReadonly(i.props) ),
      $attrs: i => (shallowReadonly(i.attrs) ),
      $slots: i => (shallowReadonly(i.slots) ),
      $refs: i => (shallowReadonly(i.refs) ),
      $parent: i => getPublicInstance(i.parent),
      $root: i => getPublicInstance(i.root),
      $emit: i => i.emit,
      $options: i => (resolveMergedOptions(i) ),
      $forceUpdate: i => () => queueJob(i.update),
      $nextTick: i => nextTick.bind(i.proxy),
      $watch: i => (instanceWatch.bind(i) )
  });
  const PublicInstanceProxyHandlers = {
      get({ _: instance }, key) {
          const { ctx, setupState, data, props, accessCache, type, appContext } = instance;
          // let @vue/reactivity know it should never observe Vue public instances.
          if (key === "__v_skip" /* SKIP */) {
              return true;
          }
          // for internal formatters to know that this is a Vue instance
          if (key === '__isVue') {
              return true;
          }
          // data / props / ctx
          // This getter gets called for every property access on the render context
          // during render and is a major hotspot. The most expensive part of this
          // is the multiple hasOwn() calls. It's much faster to do a simple property
          // access on a plain object, so we use an accessCache object (with null
          // prototype) to memoize what access type a key corresponds to.
          let normalizedProps;
          if (key[0] !== '$') {
              const n = accessCache[key];
              if (n !== undefined) {
                  switch (n) {
                      case 0 /* SETUP */:
                          return setupState[key];
                      case 1 /* DATA */:
                          return data[key];
                      case 3 /* CONTEXT */:
                          return ctx[key];
                      case 2 /* PROPS */:
                          return props[key];
                      // default: just fallthrough
                  }
              }
              else if (setupState !== EMPTY_OBJ && hasOwn(setupState, key)) {
                  accessCache[key] = 0 /* SETUP */;
                  return setupState[key];
              }
              else if (data !== EMPTY_OBJ && hasOwn(data, key)) {
                  accessCache[key] = 1 /* DATA */;
                  return data[key];
              }
              else if (
              // only cache other properties when instance has declared (thus stable)
              // props
              (normalizedProps = instance.propsOptions[0]) &&
                  hasOwn(normalizedProps, key)) {
                  accessCache[key] = 2 /* PROPS */;
                  return props[key];
              }
              else if (ctx !== EMPTY_OBJ && hasOwn(ctx, key)) {
                  accessCache[key] = 3 /* CONTEXT */;
                  return ctx[key];
              }
              else if (shouldCacheAccess) {
                  accessCache[key] = 4 /* OTHER */;
              }
          }
          const publicGetter = publicPropertiesMap[key];
          let cssModule, globalProperties;
          // public $xxx properties
          if (publicGetter) {
              if (key === '$attrs') {
                  track(instance, "get" /* GET */, key);
                  markAttrsAccessed();
              }
              return publicGetter(instance);
          }
          else if (
          // css module (injected by vue-loader)
          (cssModule = type.__cssModules) &&
              (cssModule = cssModule[key])) {
              return cssModule;
          }
          else if (ctx !== EMPTY_OBJ && hasOwn(ctx, key)) {
              // user may set custom properties to `this` that start with `$`
              accessCache[key] = 3 /* CONTEXT */;
              return ctx[key];
          }
          else if (
          // global properties
          ((globalProperties = appContext.config.globalProperties),
              hasOwn(globalProperties, key))) {
              return globalProperties[key];
          }
          else if (currentRenderingInstance &&
              (!isString(key) ||
                  // #1091 avoid internal isRef/isVNode checks on component instance leading
                  // to infinite warning loop
                  key.indexOf('__v') !== 0)) {
              if (data !== EMPTY_OBJ &&
                  (key[0] === '$' || key[0] === '_') &&
                  hasOwn(data, key)) {
                  warn(`Property ${JSON.stringify(key)} must be accessed via $data because it starts with a reserved ` +
                      `character ("$" or "_") and is not proxied on the render context.`);
              }
              else if (instance === currentRenderingInstance) {
                  warn(`Property ${JSON.stringify(key)} was accessed during render ` +
                      `but is not defined on instance.`);
              }
          }
      },
      set({ _: instance }, key, value) {
          const { data, setupState, ctx } = instance;
          if (setupState !== EMPTY_OBJ && hasOwn(setupState, key)) {
              setupState[key] = value;
          }
          else if (data !== EMPTY_OBJ && hasOwn(data, key)) {
              data[key] = value;
          }
          else if (hasOwn(instance.props, key)) {
              warn(`Attempting to mutate prop "${key}". Props are readonly.`, instance);
              return false;
          }
          if (key[0] === '$' && key.slice(1) in instance) {
              warn(`Attempting to mutate public property "${key}". ` +
                      `Properties starting with $ are reserved and readonly.`, instance);
              return false;
          }
          else {
              if (key in instance.appContext.config.globalProperties) {
                  Object.defineProperty(ctx, key, {
                      enumerable: true,
                      configurable: true,
                      value
                  });
              }
              else {
                  ctx[key] = value;
              }
          }
          return true;
      },
      has({ _: { data, setupState, accessCache, ctx, appContext, propsOptions } }, key) {
          let normalizedProps;
          return (accessCache[key] !== undefined ||
              (data !== EMPTY_OBJ && hasOwn(data, key)) ||
              (setupState !== EMPTY_OBJ && hasOwn(setupState, key)) ||
              ((normalizedProps = propsOptions[0]) && hasOwn(normalizedProps, key)) ||
              hasOwn(ctx, key) ||
              hasOwn(publicPropertiesMap, key) ||
              hasOwn(appContext.config.globalProperties, key));
      }
  };
  {
      PublicInstanceProxyHandlers.ownKeys = (target) => {
          warn(`Avoid app logic that relies on enumerating keys on a component instance. ` +
              `The keys will be empty in production mode to avoid performance overhead.`);
          return Reflect.ownKeys(target);
      };
  }
  const RuntimeCompiledPublicInstanceProxyHandlers = extend({}, PublicInstanceProxyHandlers, {
      get(target, key) {
          // fast path for unscopables when using `with` block
          if (key === Symbol.unscopables) {
              return;
          }
          return PublicInstanceProxyHandlers.get(target, key, target);
      },
      has(_, key) {
          const has = key[0] !== '_' && !isGloballyWhitelisted(key);
          if (!has && PublicInstanceProxyHandlers.has(_, key)) {
              warn(`Property ${JSON.stringify(key)} should not start with _ which is a reserved prefix for Vue internals.`);
          }
          return has;
      }
  });
  // In dev mode, the proxy target exposes the same properties as seen on `this`
  // for easier console inspection. In prod mode it will be an empty object so
  // these properties definitions can be skipped.
  function createRenderContext(instance) {
      const target = {};
      // expose internal instance for proxy handlers
      Object.defineProperty(target, `_`, {
          configurable: true,
          enumerable: false,
          get: () => instance
      });
      // expose public properties
      Object.keys(publicPropertiesMap).forEach(key => {
          Object.defineProperty(target, key, {
              configurable: true,
              enumerable: false,
              get: () => publicPropertiesMap[key](instance),
              // intercepted by the proxy so no need for implementation,
              // but needed to prevent set errors
              set: NOOP
          });
      });
      // expose global properties
      const { globalProperties } = instance.appContext.config;
      Object.keys(globalProperties).forEach(key => {
          Object.defineProperty(target, key, {
              configurable: true,
              enumerable: false,
              get: () => globalProperties[key],
              set: NOOP
          });
      });
      return target;
  }
  // dev only
  function exposePropsOnRenderContext(instance) {
      const { ctx, propsOptions: [propsOptions] } = instance;
      if (propsOptions) {
          Object.keys(propsOptions).forEach(key => {
              Object.defineProperty(ctx, key, {
                  enumerable: true,
                  configurable: true,
                  get: () => instance.props[key],
                  set: NOOP
              });
          });
      }
  }
  // dev only
  function exposeSetupStateOnRenderContext(instance) {
      const { ctx, setupState } = instance;
      Object.keys(toRaw(setupState)).forEach(key => {
          if (key[0] === '$' || key[0] === '_') {
              warn(`setup() return property ${JSON.stringify(key)} should not start with "$" or "_" ` +
                  `which are reserved prefixes for Vue internals.`);
              return;
          }
          Object.defineProperty(ctx, key, {
              enumerable: true,
              configurable: true,
              get: () => setupState[key],
              set: NOOP
          });
      });
  }

  const emptyAppContext = createAppContext();
  let uid$2 = 0;
  function createComponentInstance(vnode, parent, suspense) {
      const type = vnode.type;
      // inherit parent app context - or - if root, adopt from root vnode
      const appContext = (parent ? parent.appContext : vnode.appContext) || emptyAppContext;
      const instance = {
          uid: uid$2++,
          vnode,
          type,
          parent,
          appContext,
          root: null,
          next: null,
          subTree: null,
          update: null,
          render: null,
          proxy: null,
          exposed: null,
          withProxy: null,
          effects: null,
          provides: parent ? parent.provides : Object.create(appContext.provides),
          accessCache: null,
          renderCache: [],
          // local resovled assets
          components: null,
          directives: null,
          // resolved props and emits options
          propsOptions: normalizePropsOptions(type, appContext),
          emitsOptions: normalizeEmitsOptions(type, appContext),
          // emit
          emit: null,
          emitted: null,
          // props default value
          propsDefaults: EMPTY_OBJ,
          // state
          ctx: EMPTY_OBJ,
          data: EMPTY_OBJ,
          props: EMPTY_OBJ,
          attrs: EMPTY_OBJ,
          slots: EMPTY_OBJ,
          refs: EMPTY_OBJ,
          setupState: EMPTY_OBJ,
          setupContext: null,
          // suspense related
          suspense,
          suspenseId: suspense ? suspense.pendingId : 0,
          asyncDep: null,
          asyncResolved: false,
          // lifecycle hooks
          // not using enums here because it results in computed properties
          isMounted: false,
          isUnmounted: false,
          isDeactivated: false,
          bc: null,
          c: null,
          bm: null,
          m: null,
          bu: null,
          u: null,
          um: null,
          bum: null,
          da: null,
          a: null,
          rtg: null,
          rtc: null,
          ec: null
      };
      {
          instance.ctx = createRenderContext(instance);
      }
      instance.root = parent ? parent.root : instance;
      instance.emit = emit.bind(null, instance);
      return instance;
  }
  let currentInstance = null;
  const getCurrentInstance = () => currentInstance || currentRenderingInstance;
  const setCurrentInstance = (instance) => {
      currentInstance = instance;
  };
  const isBuiltInTag = /*#__PURE__*/ makeMap('slot,component');
  function validateComponentName(name, config) {
      const appIsNativeTag = config.isNativeTag || NO;
      if (isBuiltInTag(name) || appIsNativeTag(name)) {
          warn('Do not use built-in or reserved HTML elements as component id: ' + name);
      }
  }
  function isStatefulComponent(instance) {
      return instance.vnode.shapeFlag & 4 /* STATEFUL_COMPONENT */;
  }
  let isInSSRComponentSetup = false;
  function setupComponent(instance, isSSR = false) {
      isInSSRComponentSetup = isSSR;
      const { props, children } = instance.vnode;
      const isStateful = isStatefulComponent(instance);
      initProps(instance, props, isStateful, isSSR);
      initSlots(instance, children);
      const setupResult = isStateful
          ? setupStatefulComponent(instance, isSSR)
          : undefined;
      isInSSRComponentSetup = false;
      return setupResult;
  }
  function setupStatefulComponent(instance, isSSR) {
      const Component = instance.type;
      {
          if (Component.name) {
              validateComponentName(Component.name, instance.appContext.config);
          }
          if (Component.components) {
              const names = Object.keys(Component.components);
              for (let i = 0; i < names.length; i++) {
                  validateComponentName(names[i], instance.appContext.config);
              }
          }
          if (Component.directives) {
              const names = Object.keys(Component.directives);
              for (let i = 0; i < names.length; i++) {
                  validateDirectiveName(names[i]);
              }
          }
      }
      // 0. create render proxy property access cache
      instance.accessCache = Object.create(null);
      // 1. create public instance / render proxy
      // also mark it raw so it's never observed
      instance.proxy = new Proxy(instance.ctx, PublicInstanceProxyHandlers);
      {
          exposePropsOnRenderContext(instance);
      }
      // 2. call setup()
      const { setup } = Component;
      if (setup) {
          const setupContext = (instance.setupContext =
              setup.length > 1 ? createSetupContext(instance) : null);
          currentInstance = instance;
          pauseTracking();
          const setupResult = callWithErrorHandling(setup, instance, 0 /* SETUP_FUNCTION */, [shallowReadonly(instance.props) , setupContext]);
          resetTracking();
          currentInstance = null;
          if (isPromise(setupResult)) {
              if (isSSR) {
                  // return the promise so server-renderer can wait on it
                  return setupResult
                      .then((resolvedResult) => {
                      handleSetupResult(instance, resolvedResult, isSSR);
                  })
                      .catch(e => {
                      handleError(e, instance, 0 /* SETUP_FUNCTION */);
                  });
              }
              else {
                  // async setup returned Promise.
                  // bail here and wait for re-entry.
                  instance.asyncDep = setupResult;
              }
          }
          else {
              handleSetupResult(instance, setupResult, isSSR);
          }
      }
      else {
          finishComponentSetup(instance, isSSR);
      }
  }
  function handleSetupResult(instance, setupResult, isSSR) {
      if (isFunction(setupResult)) {
          // setup returned an inline render function
          {
              instance.render = setupResult;
          }
      }
      else if (isObject(setupResult)) {
          if (isVNode(setupResult)) {
              warn(`setup() should not return VNodes directly - ` +
                  `return a render function instead.`);
          }
          // setup returned bindings.
          // assuming a render function compiled from template is present.
          {
              instance.devtoolsRawSetupState = setupResult;
          }
          instance.setupState = proxyRefs(setupResult);
          {
              exposeSetupStateOnRenderContext(instance);
          }
      }
      else if (setupResult !== undefined) {
          warn(`setup() should return an object. Received: ${setupResult === null ? 'null' : typeof setupResult}`);
      }
      finishComponentSetup(instance, isSSR);
  }
  let compile;
  // dev only
  const isRuntimeOnly = () => !compile;
  /**
   * For runtime-dom to register the compiler.
   * Note the exported method uses any to avoid d.ts relying on the compiler types.
   */
  function registerRuntimeCompiler(_compile) {
      compile = _compile;
  }
  function finishComponentSetup(instance, isSSR) {
      const Component = instance.type;
      // template / render function normalization
      if (!instance.render) {
          // could be set from setup()
          if (compile && Component.template && !Component.render) {
              {
                  startMeasure(instance, `compile`);
              }
              Component.render = compile(Component.template, {
                  isCustomElement: instance.appContext.config.isCustomElement,
                  delimiters: Component.delimiters
              });
              {
                  endMeasure(instance, `compile`);
              }
          }
          instance.render = (Component.render || NOOP);
          // for runtime-compiled render functions using `with` blocks, the render
          // proxy used needs a different `has` handler which is more performant and
          // also only allows a whitelist of globals to fallthrough.
          if (instance.render._rc) {
              instance.withProxy = new Proxy(instance.ctx, RuntimeCompiledPublicInstanceProxyHandlers);
          }
      }
      // support for 2.x options
      {
          currentInstance = instance;
          pauseTracking();
          applyOptions(instance, Component);
          resetTracking();
          currentInstance = null;
      }
      // warn missing template/render
      // the runtime compilation of template in SSR is done by server-render
      if (!Component.render && instance.render === NOOP && !isSSR) {
          /* istanbul ignore if */
          if (!compile && Component.template) {
              warn(`Component provided template option but ` +
                  `runtime compilation is not supported in this build of Vue.` +
                  (` Use "vue.esm-browser.js" instead.`
                          ) /* should not happen */);
          }
          else {
              warn(`Component is missing template or render function.`);
          }
      }
  }
  const attrHandlers = {
      get: (target, key) => {
          {
              markAttrsAccessed();
          }
          return target[key];
      },
      set: () => {
          warn(`setupContext.attrs is readonly.`);
          return false;
      },
      deleteProperty: () => {
          warn(`setupContext.attrs is readonly.`);
          return false;
      }
  };
  function createSetupContext(instance) {
      const expose = exposed => {
          if (instance.exposed) {
              warn(`expose() should be called only once per setup().`);
          }
          instance.exposed = proxyRefs(exposed);
      };
      {
          // We use getters in dev in case libs like test-utils overwrite instance
          // properties (overwrites should not be done in prod)
          return Object.freeze({
              get attrs() {
                  return new Proxy(instance.attrs, attrHandlers);
              },
              get slots() {
                  return shallowReadonly(instance.slots);
              },
              get emit() {
                  return (event, ...args) => instance.emit(event, ...args);
              },
              expose
          });
      }
  }
  // record effects created during a component's setup() so that they can be
  // stopped when the component unmounts
  function recordInstanceBoundEffect(effect, instance = currentInstance) {
      if (instance) {
          (instance.effects || (instance.effects = [])).push(effect);
      }
  }
  const classifyRE = /(?:^|[-_])(\w)/g;
  const classify = (str) => str.replace(classifyRE, c => c.toUpperCase()).replace(/[-_]/g, '');
  function getComponentName(Component) {
      return isFunction(Component)
          ? Component.displayName || Component.name
          : Component.name;
  }
  /* istanbul ignore next */
  function formatComponentName(instance, Component, isRoot = false) {
      let name = getComponentName(Component);
      if (!name && Component.__file) {
          const match = Component.__file.match(/([^/\\]+)\.\w+$/);
          if (match) {
              name = match[1];
          }
      }
      if (!name && instance && instance.parent) {
          // try to infer the name based on reverse resolution
          const inferFromRegistry = (registry) => {
              for (const key in registry) {
                  if (registry[key] === Component) {
                      return key;
                  }
              }
          };
          name =
              inferFromRegistry(instance.components ||
                  instance.parent.type.components) || inferFromRegistry(instance.appContext.components);
      }
      return name ? classify(name) : isRoot ? `App` : `Anonymous`;
  }
  function isClassComponent(value) {
      return isFunction(value) && '__vccOpts' in value;
  }

  function computed$1(getterOrOptions) {
      const c = computed(getterOrOptions);
      recordInstanceBoundEffect(c.effect);
      return c;
  }

  // implementation
  function defineProps() {
      {
          warn(`defineProps() is a compiler-hint helper that is only usable inside ` +
              `<script setup> of a single file component. Its arguments should be ` +
              `compiled away and passing it at runtime has no effect.`);
      }
      return null;
  }
  // implementation
  function defineEmit() {
      {
          warn(`defineEmit() is a compiler-hint helper that is only usable inside ` +
              `<script setup> of a single file component. Its arguments should be ` +
              `compiled away and passing it at runtime has no effect.`);
      }
      return null;
  }
  function useContext() {
      const i = getCurrentInstance();
      if (!i) {
          warn(`useContext() called without active instance.`);
      }
      return i.setupContext || (i.setupContext = createSetupContext(i));
  }

  // Actual implementation
  function h(type, propsOrChildren, children) {
      const l = arguments.length;
      if (l === 2) {
          if (isObject(propsOrChildren) && !isArray(propsOrChildren)) {
              // single vnode without props
              if (isVNode(propsOrChildren)) {
                  return createVNode(type, null, [propsOrChildren]);
              }
              // props without children
              return createVNode(type, propsOrChildren);
          }
          else {
              // omit props
              return createVNode(type, null, propsOrChildren);
          }
      }
      else {
          if (l > 3) {
              children = Array.prototype.slice.call(arguments, 2);
          }
          else if (l === 3 && isVNode(children)) {
              children = [children];
          }
          return createVNode(type, propsOrChildren, children);
      }
  }

  const ssrContextKey = Symbol(`ssrContext` );
  const useSSRContext = () => {
      {
          const ctx = inject(ssrContextKey);
          if (!ctx) {
              warn(`Server rendering context not provided. Make sure to only call ` +
                  `useSSRContext() conditionally in the server build.`);
          }
          return ctx;
      }
  };

  function initCustomFormatter() {
      /* eslint-disable no-restricted-globals */
      if (typeof window === 'undefined') {
          return;
      }
      const vueStyle = { style: 'color:#3ba776' };
      const numberStyle = { style: 'color:#0b1bc9' };
      const stringStyle = { style: 'color:#b62e24' };
      const keywordStyle = { style: 'color:#9d288c' };
      // custom formatter for Chrome
      // https://www.mattzeunert.com/2016/02/19/custom-chrome-devtools-object-formatters.html
      const formatter = {
          header(obj) {
              // TODO also format ComponentPublicInstance & ctx.slots/attrs in setup
              if (!isObject(obj)) {
                  return null;
              }
              if (obj.__isVue) {
                  return ['div', vueStyle, `VueInstance`];
              }
              else if (isRef(obj)) {
                  return [
                      'div',
                      {},
                      ['span', vueStyle, genRefFlag(obj)],
                      '<',
                      formatValue(obj.value),
                      `>`
                  ];
              }
              else if (isReactive(obj)) {
                  return [
                      'div',
                      {},
                      ['span', vueStyle, 'Reactive'],
                      '<',
                      formatValue(obj),
                      `>${isReadonly(obj) ? ` (readonly)` : ``}`
                  ];
              }
              else if (isReadonly(obj)) {
                  return [
                      'div',
                      {},
                      ['span', vueStyle, 'Readonly'],
                      '<',
                      formatValue(obj),
                      '>'
                  ];
              }
              return null;
          },
          hasBody(obj) {
              return obj && obj.__isVue;
          },
          body(obj) {
              if (obj && obj.__isVue) {
                  return [
                      'div',
                      {},
                      ...formatInstance(obj.$)
                  ];
              }
          }
      };
      function formatInstance(instance) {
          const blocks = [];
          if (instance.type.props && instance.props) {
              blocks.push(createInstanceBlock('props', toRaw(instance.props)));
          }
          if (instance.setupState !== EMPTY_OBJ) {
              blocks.push(createInstanceBlock('setup', instance.setupState));
          }
          if (instance.data !== EMPTY_OBJ) {
              blocks.push(createInstanceBlock('data', toRaw(instance.data)));
          }
          const computed = extractKeys(instance, 'computed');
          if (computed) {
              blocks.push(createInstanceBlock('computed', computed));
          }
          const injected = extractKeys(instance, 'inject');
          if (injected) {
              blocks.push(createInstanceBlock('injected', injected));
          }
          blocks.push([
              'div',
              {},
              [
                  'span',
                  {
                      style: keywordStyle.style + ';opacity:0.66'
                  },
                  '$ (internal): '
              ],
              ['object', { object: instance }]
          ]);
          return blocks;
      }
      function createInstanceBlock(type, target) {
          target = extend({}, target);
          if (!Object.keys(target).length) {
              return ['span', {}];
          }
          return [
              'div',
              { style: 'line-height:1.25em;margin-bottom:0.6em' },
              [
                  'div',
                  {
                      style: 'color:#476582'
                  },
                  type
              ],
              [
                  'div',
                  {
                      style: 'padding-left:1.25em'
                  },
                  ...Object.keys(target).map(key => {
                      return [
                          'div',
                          {},
                          ['span', keywordStyle, key + ': '],
                          formatValue(target[key], false)
                      ];
                  })
              ]
          ];
      }
      function formatValue(v, asRaw = true) {
          if (typeof v === 'number') {
              return ['span', numberStyle, v];
          }
          else if (typeof v === 'string') {
              return ['span', stringStyle, JSON.stringify(v)];
          }
          else if (typeof v === 'boolean') {
              return ['span', keywordStyle, v];
          }
          else if (isObject(v)) {
              return ['object', { object: asRaw ? toRaw(v) : v }];
          }
          else {
              return ['span', stringStyle, String(v)];
          }
      }
      function extractKeys(instance, type) {
          const Comp = instance.type;
          if (isFunction(Comp)) {
              return;
          }
          const extracted = {};
          for (const key in instance.ctx) {
              if (isKeyOfType(Comp, key, type)) {
                  extracted[key] = instance.ctx[key];
              }
          }
          return extracted;
      }
      function isKeyOfType(Comp, key, type) {
          const opts = Comp[type];
          if ((isArray(opts) && opts.includes(key)) ||
              (isObject(opts) && key in opts)) {
              return true;
          }
          if (Comp.extends && isKeyOfType(Comp.extends, key, type)) {
              return true;
          }
          if (Comp.mixins && Comp.mixins.some(m => isKeyOfType(m, key, type))) {
              return true;
          }
      }
      function genRefFlag(v) {
          if (v._shallow) {
              return `ShallowRef`;
          }
          if (v.effect) {
              return `ComputedRef`;
          }
          return `Ref`;
      }
      if (window.devtoolsFormatters) {
          window.devtoolsFormatters.push(formatter);
      }
      else {
          window.devtoolsFormatters = [formatter];
      }
  }

  /**
   * Actual implementation
   */
  function renderList(source, renderItem) {
      let ret;
      if (isArray(source) || isString(source)) {
          ret = new Array(source.length);
          for (let i = 0, l = source.length; i < l; i++) {
              ret[i] = renderItem(source[i], i);
          }
      }
      else if (typeof source === 'number') {
          if (!Number.isInteger(source)) {
              warn(`The v-for range expect an integer value but got ${source}.`);
              return [];
          }
          ret = new Array(source);
          for (let i = 0; i < source; i++) {
              ret[i] = renderItem(i + 1, i);
          }
      }
      else if (isObject(source)) {
          if (source[Symbol.iterator]) {
              ret = Array.from(source, renderItem);
          }
          else {
              const keys = Object.keys(source);
              ret = new Array(keys.length);
              for (let i = 0, l = keys.length; i < l; i++) {
                  const key = keys[i];
                  ret[i] = renderItem(source[key], key, i);
              }
          }
      }
      else {
          ret = [];
      }
      return ret;
  }

  /**
   * For prefixing keys in v-on="obj" with "on"
   * @private
   */
  function toHandlers(obj) {
      const ret = {};
      if (!isObject(obj)) {
          warn(`v-on with no argument expects an object value.`);
          return ret;
      }
      for (const key in obj) {
          ret[toHandlerKey(key)] = obj[key];
      }
      return ret;
  }

  /**
   * Compiler runtime helper for creating dynamic slots object
   * @private
   */
  function createSlots(slots, dynamicSlots) {
      for (let i = 0; i < dynamicSlots.length; i++) {
          const slot = dynamicSlots[i];
          // array of dynamic slot generated by <template v-for="..." #[...]>
          if (isArray(slot)) {
              for (let j = 0; j < slot.length; j++) {
                  slots[slot[j].name] = slot[j].fn;
              }
          }
          else if (slot) {
              // conditional single slot generated by <template v-if="..." #foo>
              slots[slot.name] = slot.fn;
          }
      }
      return slots;
  }

  // Core API ------------------------------------------------------------------
  const version = "3.0.11";
  /**
   * SSR utils for \@vue/server-renderer. Only exposed in cjs builds.
   * @internal
   */
  const ssrUtils = (null);

  const svgNS = 'http://www.w3.org/2000/svg';
  const doc = (typeof document !== 'undefined' ? document : null);
  let tempContainer;
  let tempSVGContainer;
  const nodeOps = {
      insert: (child, parent, anchor) => {
          parent.insertBefore(child, anchor || null);
      },
      remove: child => {
          const parent = child.parentNode;
          if (parent) {
              parent.removeChild(child);
          }
      },
      createElement: (tag, isSVG, is, props) => {
          const el = isSVG
              ? doc.createElementNS(svgNS, tag)
              : doc.createElement(tag, is ? { is } : undefined);
          if (tag === 'select' && props && props.multiple != null) {
              el.setAttribute('multiple', props.multiple);
          }
          return el;
      },
      createText: text => doc.createTextNode(text),
      createComment: text => doc.createComment(text),
      setText: (node, text) => {
          node.nodeValue = text;
      },
      setElementText: (el, text) => {
          el.textContent = text;
      },
      parentNode: node => node.parentNode,
      nextSibling: node => node.nextSibling,
      querySelector: selector => doc.querySelector(selector),
      setScopeId(el, id) {
          el.setAttribute(id, '');
      },
      cloneNode(el) {
          const cloned = el.cloneNode(true);
          // #3072
          // - in `patchDOMProp`, we store the actual value in the `el._value` property.
          // - normally, elements using `:value` bindings will not be hoisted, but if
          //   the bound value is a constant, e.g. `:value="true"` - they do get
          //   hoisted.
          // - in production, hoisted nodes are cloned when subsequent inserts, but
          //   cloneNode() does not copy the custom property we attached.
          // - This may need to account for other custom DOM properties we attach to
          //   elements in addition to `_value` in the future.
          if (`_value` in el) {
              cloned._value = el._value;
          }
          return cloned;
      },
      // __UNSAFE__
      // Reason: innerHTML.
      // Static content here can only come from compiled templates.
      // As long as the user only uses trusted templates, this is safe.
      insertStaticContent(content, parent, anchor, isSVG) {
          const temp = isSVG
              ? tempSVGContainer ||
                  (tempSVGContainer = doc.createElementNS(svgNS, 'svg'))
              : tempContainer || (tempContainer = doc.createElement('div'));
          temp.innerHTML = content;
          const first = temp.firstChild;
          let node = first;
          let last = node;
          while (node) {
              last = node;
              nodeOps.insert(node, parent, anchor);
              node = temp.firstChild;
          }
          return [first, last];
      }
  };

  // compiler should normalize class + :class bindings on the same element
  // into a single binding ['staticClass', dynamic]
  function patchClass(el, value, isSVG) {
      if (value == null) {
          value = '';
      }
      if (isSVG) {
          el.setAttribute('class', value);
      }
      else {
          // directly setting className should be faster than setAttribute in theory
          // if this is an element during a transition, take the temporary transition
          // classes into account.
          const transitionClasses = el._vtc;
          if (transitionClasses) {
              value = (value
                  ? [value, ...transitionClasses]
                  : [...transitionClasses]).join(' ');
          }
          el.className = value;
      }
  }

  function patchStyle(el, prev, next) {
      const style = el.style;
      if (!next) {
          el.removeAttribute('style');
      }
      else if (isString(next)) {
          if (prev !== next) {
              const current = style.display;
              style.cssText = next;
              // indicates that the `display` of the element is controlled by `v-show`,
              // so we always keep the current `display` value regardless of the `style` value,
              // thus handing over control to `v-show`.
              if ('_vod' in el) {
                  style.display = current;
              }
          }
      }
      else {
          for (const key in next) {
              setStyle(style, key, next[key]);
          }
          if (prev && !isString(prev)) {
              for (const key in prev) {
                  if (next[key] == null) {
                      setStyle(style, key, '');
                  }
              }
          }
      }
  }
  const importantRE = /\s*!important$/;
  function setStyle(style, name, val) {
      if (isArray(val)) {
          val.forEach(v => setStyle(style, name, v));
      }
      else {
          if (name.startsWith('--')) {
              // custom property definition
              style.setProperty(name, val);
          }
          else {
              const prefixed = autoPrefix(style, name);
              if (importantRE.test(val)) {
                  // !important
                  style.setProperty(hyphenate(prefixed), val.replace(importantRE, ''), 'important');
              }
              else {
                  style[prefixed] = val;
              }
          }
      }
  }
  const prefixes = ['Webkit', 'Moz', 'ms'];
  const prefixCache = {};
  function autoPrefix(style, rawName) {
      const cached = prefixCache[rawName];
      if (cached) {
          return cached;
      }
      let name = camelize(rawName);
      if (name !== 'filter' && name in style) {
          return (prefixCache[rawName] = name);
      }
      name = capitalize(name);
      for (let i = 0; i < prefixes.length; i++) {
          const prefixed = prefixes[i] + name;
          if (prefixed in style) {
              return (prefixCache[rawName] = prefixed);
          }
      }
      return rawName;
  }

  const xlinkNS = 'http://www.w3.org/1999/xlink';
  function patchAttr(el, key, value, isSVG) {
      if (isSVG && key.startsWith('xlink:')) {
          if (value == null) {
              el.removeAttributeNS(xlinkNS, key.slice(6, key.length));
          }
          else {
              el.setAttributeNS(xlinkNS, key, value);
          }
      }
      else {
          // note we are only checking boolean attributes that don't have a
          // corresponding dom prop of the same name here.
          const isBoolean = isSpecialBooleanAttr(key);
          if (value == null || (isBoolean && value === false)) {
              el.removeAttribute(key);
          }
          else {
              el.setAttribute(key, isBoolean ? '' : value);
          }
      }
  }

  // __UNSAFE__
  // functions. The user is responsible for using them with only trusted content.
  function patchDOMProp(el, key, value, 
  // the following args are passed only due to potential innerHTML/textContent
  // overriding existing VNodes, in which case the old tree must be properly
  // unmounted.
  prevChildren, parentComponent, parentSuspense, unmountChildren) {
      if (key === 'innerHTML' || key === 'textContent') {
          if (prevChildren) {
              unmountChildren(prevChildren, parentComponent, parentSuspense);
          }
          el[key] = value == null ? '' : value;
          return;
      }
      if (key === 'value' && el.tagName !== 'PROGRESS') {
          // store value as _value as well since
          // non-string values will be stringified.
          el._value = value;
          const newValue = value == null ? '' : value;
          if (el.value !== newValue) {
              el.value = newValue;
          }
          return;
      }
      if (value === '' || value == null) {
          const type = typeof el[key];
          if (value === '' && type === 'boolean') {
              // e.g. <select multiple> compiles to { multiple: '' }
              el[key] = true;
              return;
          }
          else if (value == null && type === 'string') {
              // e.g. <div :id="null">
              el[key] = '';
              el.removeAttribute(key);
              return;
          }
          else if (type === 'number') {
              // e.g. <img :width="null">
              el[key] = 0;
              el.removeAttribute(key);
              return;
          }
      }
      // some properties perform value validation and throw
      try {
          el[key] = value;
      }
      catch (e) {
          {
              warn(`Failed setting prop "${key}" on <${el.tagName.toLowerCase()}>: ` +
                  `value ${value} is invalid.`, e);
          }
      }
  }

  // Async edge case fix requires storing an event listener's attach timestamp.
  let _getNow = Date.now;
  let skipTimestampCheck = false;
  if (typeof window !== 'undefined') {
      // Determine what event timestamp the browser is using. Annoyingly, the
      // timestamp can either be hi-res (relative to page load) or low-res
      // (relative to UNIX epoch), so in order to compare time we have to use the
      // same timestamp type when saving the flush timestamp.
      if (_getNow() > document.createEvent('Event').timeStamp) {
          // if the low-res timestamp which is bigger than the event timestamp
          // (which is evaluated AFTER) it means the event is using a hi-res timestamp,
          // and we need to use the hi-res version for event listeners as well.
          _getNow = () => performance.now();
      }
      // #3485: Firefox <= 53 has incorrect Event.timeStamp implementation
      // and does not fire microtasks in between event propagation, so safe to exclude.
      const ffMatch = navigator.userAgent.match(/firefox\/(\d+)/i);
      skipTimestampCheck = !!(ffMatch && Number(ffMatch[1]) <= 53);
  }
  // To avoid the overhead of repeatedly calling performance.now(), we cache
  // and use the same timestamp for all event listeners attached in the same tick.
  let cachedNow = 0;
  const p = Promise.resolve();
  const reset = () => {
      cachedNow = 0;
  };
  const getNow = () => cachedNow || (p.then(reset), (cachedNow = _getNow()));
  function addEventListener(el, event, handler, options) {
      el.addEventListener(event, handler, options);
  }
  function removeEventListener(el, event, handler, options) {
      el.removeEventListener(event, handler, options);
  }
  function patchEvent(el, rawName, prevValue, nextValue, instance = null) {
      // vei = vue event invokers
      const invokers = el._vei || (el._vei = {});
      const existingInvoker = invokers[rawName];
      if (nextValue && existingInvoker) {
          // patch
          existingInvoker.value = nextValue;
      }
      else {
          const [name, options] = parseName(rawName);
          if (nextValue) {
              // add
              const invoker = (invokers[rawName] = createInvoker(nextValue, instance));
              addEventListener(el, name, invoker, options);
          }
          else if (existingInvoker) {
              // remove
              removeEventListener(el, name, existingInvoker, options);
              invokers[rawName] = undefined;
          }
      }
  }
  const optionsModifierRE = /(?:Once|Passive|Capture)$/;
  function parseName(name) {
      let options;
      if (optionsModifierRE.test(name)) {
          options = {};
          let m;
          while ((m = name.match(optionsModifierRE))) {
              name = name.slice(0, name.length - m[0].length);
              options[m[0].toLowerCase()] = true;
          }
      }
      return [hyphenate(name.slice(2)), options];
  }
  function createInvoker(initialValue, instance) {
      const invoker = (e) => {
          // async edge case #6566: inner click event triggers patch, event handler
          // attached to outer element during patch, and triggered again. This
          // happens because browsers fire microtask ticks between event propagation.
          // the solution is simple: we save the timestamp when a handler is attached,
          // and the handler would only fire if the event passed to it was fired
          // AFTER it was attached.
          const timeStamp = e.timeStamp || _getNow();
          if (skipTimestampCheck || timeStamp >= invoker.attached - 1) {
              callWithAsyncErrorHandling(patchStopImmediatePropagation(e, invoker.value), instance, 5 /* NATIVE_EVENT_HANDLER */, [e]);
          }
      };
      invoker.value = initialValue;
      invoker.attached = getNow();
      return invoker;
  }
  function patchStopImmediatePropagation(e, value) {
      if (isArray(value)) {
          const originalStop = e.stopImmediatePropagation;
          e.stopImmediatePropagation = () => {
              originalStop.call(e);
              e._stopped = true;
          };
          return value.map(fn => (e) => !e._stopped && fn(e));
      }
      else {
          return value;
      }
  }

  const nativeOnRE = /^on[a-z]/;
  const forcePatchProp = (_, key) => key === 'value';
  const patchProp = (el, key, prevValue, nextValue, isSVG = false, prevChildren, parentComponent, parentSuspense, unmountChildren) => {
      switch (key) {
          // special
          case 'class':
              patchClass(el, nextValue, isSVG);
              break;
          case 'style':
              patchStyle(el, prevValue, nextValue);
              break;
          default:
              if (isOn(key)) {
                  // ignore v-model listeners
                  if (!isModelListener(key)) {
                      patchEvent(el, key, prevValue, nextValue, parentComponent);
                  }
              }
              else if (shouldSetAsProp(el, key, nextValue, isSVG)) {
                  patchDOMProp(el, key, nextValue, prevChildren, parentComponent, parentSuspense, unmountChildren);
              }
              else {
                  // special case for <input v-model type="checkbox"> with
                  // :true-value & :false-value
                  // store value as dom properties since non-string values will be
                  // stringified.
                  if (key === 'true-value') {
                      el._trueValue = nextValue;
                  }
                  else if (key === 'false-value') {
                      el._falseValue = nextValue;
                  }
                  patchAttr(el, key, nextValue, isSVG);
              }
              break;
      }
  };
  function shouldSetAsProp(el, key, value, isSVG) {
      if (isSVG) {
          // most keys must be set as attribute on svg elements to work
          // ...except innerHTML
          if (key === 'innerHTML') {
              return true;
          }
          // or native onclick with function values
          if (key in el && nativeOnRE.test(key) && isFunction(value)) {
              return true;
          }
          return false;
      }
      // spellcheck and draggable are numerated attrs, however their
      // corresponding DOM properties are actually booleans - this leads to
      // setting it with a string "false" value leading it to be coerced to
      // `true`, so we need to always treat them as attributes.
      // Note that `contentEditable` doesn't have this problem: its DOM
      // property is also enumerated string values.
      if (key === 'spellcheck' || key === 'draggable') {
          return false;
      }
      // #1787, #2840 form property on form elements is readonly and must be set as
      // attribute.
      if (key === 'form') {
          return false;
      }
      // #1526 <input list> must be set as attribute
      if (key === 'list' && el.tagName === 'INPUT') {
          return false;
      }
      // #2766 <textarea type> must be set as attribute
      if (key === 'type' && el.tagName === 'TEXTAREA') {
          return false;
      }
      // native onclick with string value, must be set as attribute
      if (nativeOnRE.test(key) && isString(value)) {
          return false;
      }
      return key in el;
  }

  function useCssModule(name = '$style') {
      /* istanbul ignore else */
      {
          const instance = getCurrentInstance();
          if (!instance) {
              warn(`useCssModule must be called inside setup()`);
              return EMPTY_OBJ;
          }
          const modules = instance.type.__cssModules;
          if (!modules) {
              warn(`Current instance does not have CSS modules injected.`);
              return EMPTY_OBJ;
          }
          const mod = modules[name];
          if (!mod) {
              warn(`Current instance does not have CSS module named "${name}".`);
              return EMPTY_OBJ;
          }
          return mod;
      }
  }

  /**
   * Runtime helper for SFC's CSS variable injection feature.
   * @private
   */
  function useCssVars(getter) {
      const instance = getCurrentInstance();
      /* istanbul ignore next */
      if (!instance) {
          warn(`useCssVars is called without current active component instance.`);
          return;
      }
      const setVars = () => setVarsOnVNode(instance.subTree, getter(instance.proxy));
      onMounted(() => watchEffect(setVars, { flush: 'post' }));
      onUpdated(setVars);
  }
  function setVarsOnVNode(vnode, vars) {
      if (vnode.shapeFlag & 128 /* SUSPENSE */) {
          const suspense = vnode.suspense;
          vnode = suspense.activeBranch;
          if (suspense.pendingBranch && !suspense.isHydrating) {
              suspense.effects.push(() => {
                  setVarsOnVNode(suspense.activeBranch, vars);
              });
          }
      }
      // drill down HOCs until it's a non-component vnode
      while (vnode.component) {
          vnode = vnode.component.subTree;
      }
      if (vnode.shapeFlag & 1 /* ELEMENT */ && vnode.el) {
          const style = vnode.el.style;
          for (const key in vars) {
              style.setProperty(`--${key}`, vars[key]);
          }
      }
      else if (vnode.type === Fragment) {
          vnode.children.forEach(c => setVarsOnVNode(c, vars));
      }
  }

  const TRANSITION = 'transition';
  const ANIMATION = 'animation';
  // DOM Transition is a higher-order-component based on the platform-agnostic
  // base Transition component, with DOM-specific logic.
  const Transition = (props, { slots }) => h(BaseTransition, resolveTransitionProps(props), slots);
  Transition.displayName = 'Transition';
  const DOMTransitionPropsValidators = {
      name: String,
      type: String,
      css: {
          type: Boolean,
          default: true
      },
      duration: [String, Number, Object],
      enterFromClass: String,
      enterActiveClass: String,
      enterToClass: String,
      appearFromClass: String,
      appearActiveClass: String,
      appearToClass: String,
      leaveFromClass: String,
      leaveActiveClass: String,
      leaveToClass: String
  };
  const TransitionPropsValidators = (Transition.props = /*#__PURE__*/ extend({}, BaseTransition.props, DOMTransitionPropsValidators));
  function resolveTransitionProps(rawProps) {
      let { name = 'v', type, css = true, duration, enterFromClass = `${name}-enter-from`, enterActiveClass = `${name}-enter-active`, enterToClass = `${name}-enter-to`, appearFromClass = enterFromClass, appearActiveClass = enterActiveClass, appearToClass = enterToClass, leaveFromClass = `${name}-leave-from`, leaveActiveClass = `${name}-leave-active`, leaveToClass = `${name}-leave-to` } = rawProps;
      const baseProps = {};
      for (const key in rawProps) {
          if (!(key in DOMTransitionPropsValidators)) {
              baseProps[key] = rawProps[key];
          }
      }
      if (!css) {
          return baseProps;
      }
      const durations = normalizeDuration(duration);
      const enterDuration = durations && durations[0];
      const leaveDuration = durations && durations[1];
      const { onBeforeEnter, onEnter, onEnterCancelled, onLeave, onLeaveCancelled, onBeforeAppear = onBeforeEnter, onAppear = onEnter, onAppearCancelled = onEnterCancelled } = baseProps;
      const finishEnter = (el, isAppear, done) => {
          removeTransitionClass(el, isAppear ? appearToClass : enterToClass);
          removeTransitionClass(el, isAppear ? appearActiveClass : enterActiveClass);
          done && done();
      };
      const finishLeave = (el, done) => {
          removeTransitionClass(el, leaveToClass);
          removeTransitionClass(el, leaveActiveClass);
          done && done();
      };
      const makeEnterHook = (isAppear) => {
          return (el, done) => {
              const hook = isAppear ? onAppear : onEnter;
              const resolve = () => finishEnter(el, isAppear, done);
              hook && hook(el, resolve);
              nextFrame(() => {
                  removeTransitionClass(el, isAppear ? appearFromClass : enterFromClass);
                  addTransitionClass(el, isAppear ? appearToClass : enterToClass);
                  if (!(hook && hook.length > 1)) {
                      whenTransitionEnds(el, type, enterDuration, resolve);
                  }
              });
          };
      };
      return extend(baseProps, {
          onBeforeEnter(el) {
              onBeforeEnter && onBeforeEnter(el);
              addTransitionClass(el, enterFromClass);
              addTransitionClass(el, enterActiveClass);
          },
          onBeforeAppear(el) {
              onBeforeAppear && onBeforeAppear(el);
              addTransitionClass(el, appearFromClass);
              addTransitionClass(el, appearActiveClass);
          },
          onEnter: makeEnterHook(false),
          onAppear: makeEnterHook(true),
          onLeave(el, done) {
              const resolve = () => finishLeave(el, done);
              addTransitionClass(el, leaveFromClass);
              // force reflow so *-leave-from classes immediately take effect (#2593)
              forceReflow();
              addTransitionClass(el, leaveActiveClass);
              nextFrame(() => {
                  removeTransitionClass(el, leaveFromClass);
                  addTransitionClass(el, leaveToClass);
                  if (!(onLeave && onLeave.length > 1)) {
                      whenTransitionEnds(el, type, leaveDuration, resolve);
                  }
              });
              onLeave && onLeave(el, resolve);
          },
          onEnterCancelled(el) {
              finishEnter(el, false);
              onEnterCancelled && onEnterCancelled(el);
          },
          onAppearCancelled(el) {
              finishEnter(el, true);
              onAppearCancelled && onAppearCancelled(el);
          },
          onLeaveCancelled(el) {
              finishLeave(el);
              onLeaveCancelled && onLeaveCancelled(el);
          }
      });
  }
  function normalizeDuration(duration) {
      if (duration == null) {
          return null;
      }
      else if (isObject(duration)) {
          return [NumberOf(duration.enter), NumberOf(duration.leave)];
      }
      else {
          const n = NumberOf(duration);
          return [n, n];
      }
  }
  function NumberOf(val) {
      const res = toNumber(val);
      validateDuration(res);
      return res;
  }
  function validateDuration(val) {
      if (typeof val !== 'number') {
          warn(`<transition> explicit duration is not a valid number - ` +
              `got ${JSON.stringify(val)}.`);
      }
      else if (isNaN(val)) {
          warn(`<transition> explicit duration is NaN - ` +
              'the duration expression might be incorrect.');
      }
  }
  function addTransitionClass(el, cls) {
      cls.split(/\s+/).forEach(c => c && el.classList.add(c));
      (el._vtc ||
          (el._vtc = new Set())).add(cls);
  }
  function removeTransitionClass(el, cls) {
      cls.split(/\s+/).forEach(c => c && el.classList.remove(c));
      const { _vtc } = el;
      if (_vtc) {
          _vtc.delete(cls);
          if (!_vtc.size) {
              el._vtc = undefined;
          }
      }
  }
  function nextFrame(cb) {
      requestAnimationFrame(() => {
          requestAnimationFrame(cb);
      });
  }
  let endId = 0;
  function whenTransitionEnds(el, expectedType, explicitTimeout, resolve) {
      const id = (el._endId = ++endId);
      const resolveIfNotStale = () => {
          if (id === el._endId) {
              resolve();
          }
      };
      if (explicitTimeout) {
          return setTimeout(resolveIfNotStale, explicitTimeout);
      }
      const { type, timeout, propCount } = getTransitionInfo(el, expectedType);
      if (!type) {
          return resolve();
      }
      const endEvent = type + 'end';
      let ended = 0;
      const end = () => {
          el.removeEventListener(endEvent, onEnd);
          resolveIfNotStale();
      };
      const onEnd = (e) => {
          if (e.target === el && ++ended >= propCount) {
              end();
          }
      };
      setTimeout(() => {
          if (ended < propCount) {
              end();
          }
      }, timeout + 1);
      el.addEventListener(endEvent, onEnd);
  }
  function getTransitionInfo(el, expectedType) {
      const styles = window.getComputedStyle(el);
      // JSDOM may return undefined for transition properties
      const getStyleProperties = (key) => (styles[key] || '').split(', ');
      const transitionDelays = getStyleProperties(TRANSITION + 'Delay');
      const transitionDurations = getStyleProperties(TRANSITION + 'Duration');
      const transitionTimeout = getTimeout(transitionDelays, transitionDurations);
      const animationDelays = getStyleProperties(ANIMATION + 'Delay');
      const animationDurations = getStyleProperties(ANIMATION + 'Duration');
      const animationTimeout = getTimeout(animationDelays, animationDurations);
      let type = null;
      let timeout = 0;
      let propCount = 0;
      /* istanbul ignore if */
      if (expectedType === TRANSITION) {
          if (transitionTimeout > 0) {
              type = TRANSITION;
              timeout = transitionTimeout;
              propCount = transitionDurations.length;
          }
      }
      else if (expectedType === ANIMATION) {
          if (animationTimeout > 0) {
              type = ANIMATION;
              timeout = animationTimeout;
              propCount = animationDurations.length;
          }
      }
      else {
          timeout = Math.max(transitionTimeout, animationTimeout);
          type =
              timeout > 0
                  ? transitionTimeout > animationTimeout
                      ? TRANSITION
                      : ANIMATION
                  : null;
          propCount = type
              ? type === TRANSITION
                  ? transitionDurations.length
                  : animationDurations.length
              : 0;
      }
      const hasTransform = type === TRANSITION &&
          /\b(transform|all)(,|$)/.test(styles[TRANSITION + 'Property']);
      return {
          type,
          timeout,
          propCount,
          hasTransform
      };
  }
  function getTimeout(delays, durations) {
      while (delays.length < durations.length) {
          delays = delays.concat(delays);
      }
      return Math.max(...durations.map((d, i) => toMs(d) + toMs(delays[i])));
  }
  // Old versions of Chromium (below 61.0.3163.100) formats floating pointer
  // numbers in a locale-dependent way, using a comma instead of a dot.
  // If comma is not replaced with a dot, the input will be rounded down
  // (i.e. acting as a floor function) causing unexpected behaviors
  function toMs(s) {
      return Number(s.slice(0, -1).replace(',', '.')) * 1000;
  }
  // synchronously force layout to put elements into a certain state
  function forceReflow() {
      return document.body.offsetHeight;
  }

  const positionMap = new WeakMap();
  const newPositionMap = new WeakMap();
  const TransitionGroupImpl = {
      name: 'TransitionGroup',
      props: /*#__PURE__*/ extend({}, TransitionPropsValidators, {
          tag: String,
          moveClass: String
      }),
      setup(props, { slots }) {
          const instance = getCurrentInstance();
          const state = useTransitionState();
          let prevChildren;
          let children;
          onUpdated(() => {
              // children is guaranteed to exist after initial render
              if (!prevChildren.length) {
                  return;
              }
              const moveClass = props.moveClass || `${props.name || 'v'}-move`;
              if (!hasCSSTransform(prevChildren[0].el, instance.vnode.el, moveClass)) {
                  return;
              }
              // we divide the work into three loops to avoid mixing DOM reads and writes
              // in each iteration - which helps prevent layout thrashing.
              prevChildren.forEach(callPendingCbs);
              prevChildren.forEach(recordPosition);
              const movedChildren = prevChildren.filter(applyTranslation);
              // force reflow to put everything in position
              forceReflow();
              movedChildren.forEach(c => {
                  const el = c.el;
                  const style = el.style;
                  addTransitionClass(el, moveClass);
                  style.transform = style.webkitTransform = style.transitionDuration = '';
                  const cb = (el._moveCb = (e) => {
                      if (e && e.target !== el) {
                          return;
                      }
                      if (!e || /transform$/.test(e.propertyName)) {
                          el.removeEventListener('transitionend', cb);
                          el._moveCb = null;
                          removeTransitionClass(el, moveClass);
                      }
                  });
                  el.addEventListener('transitionend', cb);
              });
          });
          return () => {
              const rawProps = toRaw(props);
              const cssTransitionProps = resolveTransitionProps(rawProps);
              const tag = rawProps.tag || Fragment;
              prevChildren = children;
              children = slots.default ? getTransitionRawChildren(slots.default()) : [];
              for (let i = 0; i < children.length; i++) {
                  const child = children[i];
                  if (child.key != null) {
                      setTransitionHooks(child, resolveTransitionHooks(child, cssTransitionProps, state, instance));
                  }
                  else {
                      warn(`<TransitionGroup> children must be keyed.`);
                  }
              }
              if (prevChildren) {
                  for (let i = 0; i < prevChildren.length; i++) {
                      const child = prevChildren[i];
                      setTransitionHooks(child, resolveTransitionHooks(child, cssTransitionProps, state, instance));
                      positionMap.set(child, child.el.getBoundingClientRect());
                  }
              }
              return createVNode(tag, null, children);
          };
      }
  };
  const TransitionGroup = TransitionGroupImpl;
  function callPendingCbs(c) {
      const el = c.el;
      if (el._moveCb) {
          el._moveCb();
      }
      if (el._enterCb) {
          el._enterCb();
      }
  }
  function recordPosition(c) {
      newPositionMap.set(c, c.el.getBoundingClientRect());
  }
  function applyTranslation(c) {
      const oldPos = positionMap.get(c);
      const newPos = newPositionMap.get(c);
      const dx = oldPos.left - newPos.left;
      const dy = oldPos.top - newPos.top;
      if (dx || dy) {
          const s = c.el.style;
          s.transform = s.webkitTransform = `translate(${dx}px,${dy}px)`;
          s.transitionDuration = '0s';
          return c;
      }
  }
  function hasCSSTransform(el, root, moveClass) {
      // Detect whether an element with the move class applied has
      // CSS transitions. Since the element may be inside an entering
      // transition at this very moment, we make a clone of it and remove
      // all other transition classes applied to ensure only the move class
      // is applied.
      const clone = el.cloneNode();
      if (el._vtc) {
          el._vtc.forEach(cls => {
              cls.split(/\s+/).forEach(c => c && clone.classList.remove(c));
          });
      }
      moveClass.split(/\s+/).forEach(c => c && clone.classList.add(c));
      clone.style.display = 'none';
      const container = (root.nodeType === 1
          ? root
          : root.parentNode);
      container.appendChild(clone);
      const { hasTransform } = getTransitionInfo(clone);
      container.removeChild(clone);
      return hasTransform;
  }

  const getModelAssigner = (vnode) => {
      const fn = vnode.props['onUpdate:modelValue'];
      return isArray(fn) ? value => invokeArrayFns(fn, value) : fn;
  };
  function onCompositionStart(e) {
      e.target.composing = true;
  }
  function onCompositionEnd(e) {
      const target = e.target;
      if (target.composing) {
          target.composing = false;
          trigger$1(target, 'input');
      }
  }
  function trigger$1(el, type) {
      const e = document.createEvent('HTMLEvents');
      e.initEvent(type, true, true);
      el.dispatchEvent(e);
  }
  // We are exporting the v-model runtime directly as vnode hooks so that it can
  // be tree-shaken in case v-model is never used.
  const vModelText = {
      created(el, { modifiers: { lazy, trim, number } }, vnode) {
          el._assign = getModelAssigner(vnode);
          const castToNumber = number || el.type === 'number';
          addEventListener(el, lazy ? 'change' : 'input', e => {
              if (e.target.composing)
                  return;
              let domValue = el.value;
              if (trim) {
                  domValue = domValue.trim();
              }
              else if (castToNumber) {
                  domValue = toNumber(domValue);
              }
              el._assign(domValue);
          });
          if (trim) {
              addEventListener(el, 'change', () => {
                  el.value = el.value.trim();
              });
          }
          if (!lazy) {
              addEventListener(el, 'compositionstart', onCompositionStart);
              addEventListener(el, 'compositionend', onCompositionEnd);
              // Safari < 10.2 & UIWebView doesn't fire compositionend when
              // switching focus before confirming composition choice
              // this also fixes the issue where some browsers e.g. iOS Chrome
              // fires "change" instead of "input" on autocomplete.
              addEventListener(el, 'change', onCompositionEnd);
          }
      },
      // set value on mounted so it's after min/max for type="range"
      mounted(el, { value }) {
          el.value = value == null ? '' : value;
      },
      beforeUpdate(el, { value, modifiers: { trim, number } }, vnode) {
          el._assign = getModelAssigner(vnode);
          // avoid clearing unresolved text. #2302
          if (el.composing)
              return;
          if (document.activeElement === el) {
              if (trim && el.value.trim() === value) {
                  return;
              }
              if ((number || el.type === 'number') && toNumber(el.value) === value) {
                  return;
              }
          }
          const newValue = value == null ? '' : value;
          if (el.value !== newValue) {
              el.value = newValue;
          }
      }
  };
  const vModelCheckbox = {
      created(el, _, vnode) {
          el._assign = getModelAssigner(vnode);
          addEventListener(el, 'change', () => {
              const modelValue = el._modelValue;
              const elementValue = getValue(el);
              const checked = el.checked;
              const assign = el._assign;
              if (isArray(modelValue)) {
                  const index = looseIndexOf(modelValue, elementValue);
                  const found = index !== -1;
                  if (checked && !found) {
                      assign(modelValue.concat(elementValue));
                  }
                  else if (!checked && found) {
                      const filtered = [...modelValue];
                      filtered.splice(index, 1);
                      assign(filtered);
                  }
              }
              else if (isSet(modelValue)) {
                  const cloned = new Set(modelValue);
                  if (checked) {
                      cloned.add(elementValue);
                  }
                  else {
                      cloned.delete(elementValue);
                  }
                  assign(cloned);
              }
              else {
                  assign(getCheckboxValue(el, checked));
              }
          });
      },
      // set initial checked on mount to wait for true-value/false-value
      mounted: setChecked,
      beforeUpdate(el, binding, vnode) {
          el._assign = getModelAssigner(vnode);
          setChecked(el, binding, vnode);
      }
  };
  function setChecked(el, { value, oldValue }, vnode) {
      el._modelValue = value;
      if (isArray(value)) {
          el.checked = looseIndexOf(value, vnode.props.value) > -1;
      }
      else if (isSet(value)) {
          el.checked = value.has(vnode.props.value);
      }
      else if (value !== oldValue) {
          el.checked = looseEqual(value, getCheckboxValue(el, true));
      }
  }
  const vModelRadio = {
      created(el, { value }, vnode) {
          el.checked = looseEqual(value, vnode.props.value);
          el._assign = getModelAssigner(vnode);
          addEventListener(el, 'change', () => {
              el._assign(getValue(el));
          });
      },
      beforeUpdate(el, { value, oldValue }, vnode) {
          el._assign = getModelAssigner(vnode);
          if (value !== oldValue) {
              el.checked = looseEqual(value, vnode.props.value);
          }
      }
  };
  const vModelSelect = {
      created(el, { value, modifiers: { number } }, vnode) {
          const isSetModel = isSet(value);
          addEventListener(el, 'change', () => {
              const selectedVal = Array.prototype.filter
                  .call(el.options, (o) => o.selected)
                  .map((o) => number ? toNumber(getValue(o)) : getValue(o));
              el._assign(el.multiple
                  ? isSetModel
                      ? new Set(selectedVal)
                      : selectedVal
                  : selectedVal[0]);
          });
          el._assign = getModelAssigner(vnode);
      },
      // set value in mounted & updated because <select> relies on its children
      // <option>s.
      mounted(el, { value }) {
          setSelected(el, value);
      },
      beforeUpdate(el, _binding, vnode) {
          el._assign = getModelAssigner(vnode);
      },
      updated(el, { value }) {
          setSelected(el, value);
      }
  };
  function setSelected(el, value) {
      const isMultiple = el.multiple;
      if (isMultiple && !isArray(value) && !isSet(value)) {
          warn(`<select multiple v-model> expects an Array or Set value for its binding, ` +
                  `but got ${Object.prototype.toString.call(value).slice(8, -1)}.`);
          return;
      }
      for (let i = 0, l = el.options.length; i < l; i++) {
          const option = el.options[i];
          const optionValue = getValue(option);
          if (isMultiple) {
              if (isArray(value)) {
                  option.selected = looseIndexOf(value, optionValue) > -1;
              }
              else {
                  option.selected = value.has(optionValue);
              }
          }
          else {
              if (looseEqual(getValue(option), value)) {
                  el.selectedIndex = i;
                  return;
              }
          }
      }
      if (!isMultiple) {
          el.selectedIndex = -1;
      }
  }
  // retrieve raw value set via :value bindings
  function getValue(el) {
      return '_value' in el ? el._value : el.value;
  }
  // retrieve raw value for true-value and false-value set via :true-value or :false-value bindings
  function getCheckboxValue(el, checked) {
      const key = checked ? '_trueValue' : '_falseValue';
      return key in el ? el[key] : checked;
  }
  const vModelDynamic = {
      created(el, binding, vnode) {
          callModelHook(el, binding, vnode, null, 'created');
      },
      mounted(el, binding, vnode) {
          callModelHook(el, binding, vnode, null, 'mounted');
      },
      beforeUpdate(el, binding, vnode, prevVNode) {
          callModelHook(el, binding, vnode, prevVNode, 'beforeUpdate');
      },
      updated(el, binding, vnode, prevVNode) {
          callModelHook(el, binding, vnode, prevVNode, 'updated');
      }
  };
  function callModelHook(el, binding, vnode, prevVNode, hook) {
      let modelToUse;
      switch (el.tagName) {
          case 'SELECT':
              modelToUse = vModelSelect;
              break;
          case 'TEXTAREA':
              modelToUse = vModelText;
              break;
          default:
              switch (vnode.props && vnode.props.type) {
                  case 'checkbox':
                      modelToUse = vModelCheckbox;
                      break;
                  case 'radio':
                      modelToUse = vModelRadio;
                      break;
                  default:
                      modelToUse = vModelText;
              }
      }
      const fn = modelToUse[hook];
      fn && fn(el, binding, vnode, prevVNode);
  }

  const systemModifiers = ['ctrl', 'shift', 'alt', 'meta'];
  const modifierGuards = {
      stop: e => e.stopPropagation(),
      prevent: e => e.preventDefault(),
      self: e => e.target !== e.currentTarget,
      ctrl: e => !e.ctrlKey,
      shift: e => !e.shiftKey,
      alt: e => !e.altKey,
      meta: e => !e.metaKey,
      left: e => 'button' in e && e.button !== 0,
      middle: e => 'button' in e && e.button !== 1,
      right: e => 'button' in e && e.button !== 2,
      exact: (e, modifiers) => systemModifiers.some(m => e[`${m}Key`] && !modifiers.includes(m))
  };
  /**
   * @private
   */
  const withModifiers = (fn, modifiers) => {
      return (event, ...args) => {
          for (let i = 0; i < modifiers.length; i++) {
              const guard = modifierGuards[modifiers[i]];
              if (guard && guard(event, modifiers))
                  return;
          }
          return fn(event, ...args);
      };
  };
  // Kept for 2.x compat.
  // Note: IE11 compat for `spacebar` and `del` is removed for now.
  const keyNames = {
      esc: 'escape',
      space: ' ',
      up: 'arrow-up',
      left: 'arrow-left',
      right: 'arrow-right',
      down: 'arrow-down',
      delete: 'backspace'
  };
  /**
   * @private
   */
  const withKeys = (fn, modifiers) => {
      return (event) => {
          if (!('key' in event))
              return;
          const eventKey = hyphenate(event.key);
          if (
          // None of the provided key modifiers match the current event key
          !modifiers.some(k => k === eventKey || keyNames[k] === eventKey)) {
              return;
          }
          return fn(event);
      };
  };

  const vShow = {
      beforeMount(el, { value }, { transition }) {
          el._vod = el.style.display === 'none' ? '' : el.style.display;
          if (transition && value) {
              transition.beforeEnter(el);
          }
          else {
              setDisplay(el, value);
          }
      },
      mounted(el, { value }, { transition }) {
          if (transition && value) {
              transition.enter(el);
          }
      },
      updated(el, { value, oldValue }, { transition }) {
          if (!value === !oldValue)
              return;
          if (transition) {
              if (value) {
                  transition.beforeEnter(el);
                  setDisplay(el, true);
                  transition.enter(el);
              }
              else {
                  transition.leave(el, () => {
                      setDisplay(el, false);
                  });
              }
          }
          else {
              setDisplay(el, value);
          }
      },
      beforeUnmount(el, { value }) {
          setDisplay(el, value);
      }
  };
  function setDisplay(el, value) {
      el.style.display = value ? el._vod : 'none';
  }

  const rendererOptions = extend({ patchProp, forcePatchProp }, nodeOps);
  // lazy create the renderer - this makes core renderer logic tree-shakable
  // in case the user only imports reactivity utilities from Vue.
  let renderer;
  let enabledHydration = false;
  function ensureRenderer() {
      return renderer || (renderer = createRenderer(rendererOptions));
  }
  function ensureHydrationRenderer() {
      renderer = enabledHydration
          ? renderer
          : createHydrationRenderer(rendererOptions);
      enabledHydration = true;
      return renderer;
  }
  // use explicit type casts here to avoid import() calls in rolled-up d.ts
  const render$8 = ((...args) => {
      ensureRenderer().render(...args);
  });
  const hydrate = ((...args) => {
      ensureHydrationRenderer().hydrate(...args);
  });
  const createApp = ((...args) => {
      const app = ensureRenderer().createApp(...args);
      {
          injectNativeTagCheck(app);
          injectCustomElementCheck(app);
      }
      const { mount } = app;
      app.mount = (containerOrSelector) => {
          const container = normalizeContainer(containerOrSelector);
          if (!container)
              return;
          const component = app._component;
          if (!isFunction(component) && !component.render && !component.template) {
              component.template = container.innerHTML;
          }
          // clear content before mounting
          container.innerHTML = '';
          const proxy = mount(container, false, container instanceof SVGElement);
          if (container instanceof Element) {
              container.removeAttribute('v-cloak');
              container.setAttribute('data-v-app', '');
          }
          return proxy;
      };
      return app;
  });
  const createSSRApp = ((...args) => {
      const app = ensureHydrationRenderer().createApp(...args);
      {
          injectNativeTagCheck(app);
          injectCustomElementCheck(app);
      }
      const { mount } = app;
      app.mount = (containerOrSelector) => {
          const container = normalizeContainer(containerOrSelector);
          if (container) {
              return mount(container, true, container instanceof SVGElement);
          }
      };
      return app;
  });
  function injectNativeTagCheck(app) {
      // Inject `isNativeTag`
      // this is used for component name validation (dev only)
      Object.defineProperty(app.config, 'isNativeTag', {
          value: (tag) => isHTMLTag(tag) || isSVGTag(tag),
          writable: false
      });
  }
  // dev only
  function injectCustomElementCheck(app) {
      if (isRuntimeOnly()) {
          const value = app.config.isCustomElement;
          Object.defineProperty(app.config, 'isCustomElement', {
              get() {
                  return value;
              },
              set() {
                  warn(`The \`isCustomElement\` config option is only respected when using the runtime compiler.` +
                      `If you are using the runtime-only build, \`isCustomElement\` must be passed to \`@vue/compiler-dom\` in the build setup instead` +
                      `- for example, via the \`compilerOptions\` option in vue-loader: https://vue-loader.vuejs.org/options.html#compileroptions.`);
              }
          });
      }
  }
  function normalizeContainer(container) {
      if (isString(container)) {
          const res = document.querySelector(container);
          if (!res) {
              warn(`Failed to mount app: mount target selector "${container}" returned null.`);
          }
          return res;
      }
      if (container instanceof window.ShadowRoot &&
          container.mode === 'closed') {
          warn(`mounting on a ShadowRoot with \`{mode: "closed"}\` may lead to unpredictable bugs`);
      }
      return container;
  }

  var runtimeDom = /*#__PURE__*/Object.freeze({
    __proto__: null,
    render: render$8,
    hydrate: hydrate,
    createApp: createApp,
    createSSRApp: createSSRApp,
    useCssModule: useCssModule,
    useCssVars: useCssVars,
    Transition: Transition,
    TransitionGroup: TransitionGroup,
    vModelText: vModelText,
    vModelCheckbox: vModelCheckbox,
    vModelRadio: vModelRadio,
    vModelSelect: vModelSelect,
    vModelDynamic: vModelDynamic,
    withModifiers: withModifiers,
    withKeys: withKeys,
    vShow: vShow,
    reactive: reactive,
    ref: ref,
    readonly: readonly,
    unref: unref,
    proxyRefs: proxyRefs,
    isRef: isRef,
    toRef: toRef,
    toRefs: toRefs,
    isProxy: isProxy,
    isReactive: isReactive,
    isReadonly: isReadonly,
    customRef: customRef,
    triggerRef: triggerRef,
    shallowRef: shallowRef,
    shallowReactive: shallowReactive,
    shallowReadonly: shallowReadonly,
    markRaw: markRaw,
    toRaw: toRaw,
    computed: computed$1,
    watch: watch,
    watchEffect: watchEffect,
    onBeforeMount: onBeforeMount,
    onMounted: onMounted,
    onBeforeUpdate: onBeforeUpdate,
    onUpdated: onUpdated,
    onBeforeUnmount: onBeforeUnmount,
    onUnmounted: onUnmounted,
    onActivated: onActivated,
    onDeactivated: onDeactivated,
    onRenderTracked: onRenderTracked,
    onRenderTriggered: onRenderTriggered,
    onErrorCaptured: onErrorCaptured,
    provide: provide,
    inject: inject,
    nextTick: nextTick,
    defineComponent: defineComponent,
    defineAsyncComponent: defineAsyncComponent,
    defineProps: defineProps,
    defineEmit: defineEmit,
    useContext: useContext,
    getCurrentInstance: getCurrentInstance,
    h: h,
    createVNode: createVNode,
    cloneVNode: cloneVNode,
    mergeProps: mergeProps,
    isVNode: isVNode,
    Fragment: Fragment,
    Text: Text,
    Comment: Comment,
    Static: Static,
    Teleport: Teleport,
    Suspense: Suspense,
    KeepAlive: KeepAlive,
    BaseTransition: BaseTransition,
    withDirectives: withDirectives,
    useSSRContext: useSSRContext,
    ssrContextKey: ssrContextKey,
    createRenderer: createRenderer,
    createHydrationRenderer: createHydrationRenderer,
    queuePostFlushCb: queuePostFlushCb,
    warn: warn,
    handleError: handleError,
    callWithErrorHandling: callWithErrorHandling,
    callWithAsyncErrorHandling: callWithAsyncErrorHandling,
    resolveComponent: resolveComponent,
    resolveDirective: resolveDirective,
    resolveDynamicComponent: resolveDynamicComponent,
    registerRuntimeCompiler: registerRuntimeCompiler,
    isRuntimeOnly: isRuntimeOnly,
    useTransitionState: useTransitionState,
    resolveTransitionHooks: resolveTransitionHooks,
    setTransitionHooks: setTransitionHooks,
    getTransitionRawChildren: getTransitionRawChildren,
    initCustomFormatter: initCustomFormatter,
    get devtools () { return devtools; },
    setDevtoolsHook: setDevtoolsHook,
    withCtx: withCtx,
    pushScopeId: pushScopeId,
    popScopeId: popScopeId,
    withScopeId: withScopeId,
    renderList: renderList,
    toHandlers: toHandlers,
    renderSlot: renderSlot,
    createSlots: createSlots,
    openBlock: openBlock,
    createBlock: createBlock,
    setBlockTracking: setBlockTracking,
    createTextVNode: createTextVNode,
    createCommentVNode: createCommentVNode,
    createStaticVNode: createStaticVNode,
    toDisplayString: toDisplayString,
    camelize: camelize,
    capitalize: capitalize,
    toHandlerKey: toHandlerKey,
    transformVNodeArgs: transformVNodeArgs,
    version: version,
    ssrUtils: ssrUtils
  });

  function initDev() {
      {
          {
              console.info(`You are running a development build of Vue.\n` +
                  `Make sure to use the production build (*.prod.js) when deploying for production.`);
          }
          initCustomFormatter();
      }
  }

  function defaultOnError(error) {
      throw error;
  }
  function createCompilerError(code, loc, messages, additionalMessage) {
      const msg = (messages || errorMessages)[code] + (additionalMessage || ``)
          ;
      const error = new SyntaxError(String(msg));
      error.code = code;
      error.loc = loc;
      return error;
  }
  const errorMessages = {
      // parse errors
      [0 /* ABRUPT_CLOSING_OF_EMPTY_COMMENT */]: 'Illegal comment.',
      [1 /* CDATA_IN_HTML_CONTENT */]: 'CDATA section is allowed only in XML context.',
      [2 /* DUPLICATE_ATTRIBUTE */]: 'Duplicate attribute.',
      [3 /* END_TAG_WITH_ATTRIBUTES */]: 'End tag cannot have attributes.',
      [4 /* END_TAG_WITH_TRAILING_SOLIDUS */]: "Illegal '/' in tags.",
      [5 /* EOF_BEFORE_TAG_NAME */]: 'Unexpected EOF in tag.',
      [6 /* EOF_IN_CDATA */]: 'Unexpected EOF in CDATA section.',
      [7 /* EOF_IN_COMMENT */]: 'Unexpected EOF in comment.',
      [8 /* EOF_IN_SCRIPT_HTML_COMMENT_LIKE_TEXT */]: 'Unexpected EOF in script.',
      [9 /* EOF_IN_TAG */]: 'Unexpected EOF in tag.',
      [10 /* INCORRECTLY_CLOSED_COMMENT */]: 'Incorrectly closed comment.',
      [11 /* INCORRECTLY_OPENED_COMMENT */]: 'Incorrectly opened comment.',
      [12 /* INVALID_FIRST_CHARACTER_OF_TAG_NAME */]: "Illegal tag name. Use '&lt;' to print '<'.",
      [13 /* MISSING_ATTRIBUTE_VALUE */]: 'Attribute value was expected.',
      [14 /* MISSING_END_TAG_NAME */]: 'End tag name was expected.',
      [15 /* MISSING_WHITESPACE_BETWEEN_ATTRIBUTES */]: 'Whitespace was expected.',
      [16 /* NESTED_COMMENT */]: "Unexpected '<!--' in comment.",
      [17 /* UNEXPECTED_CHARACTER_IN_ATTRIBUTE_NAME */]: 'Attribute name cannot contain U+0022 ("), U+0027 (\'), and U+003C (<).',
      [18 /* UNEXPECTED_CHARACTER_IN_UNQUOTED_ATTRIBUTE_VALUE */]: 'Unquoted attribute value cannot contain U+0022 ("), U+0027 (\'), U+003C (<), U+003D (=), and U+0060 (`).',
      [19 /* UNEXPECTED_EQUALS_SIGN_BEFORE_ATTRIBUTE_NAME */]: "Attribute name cannot start with '='.",
      [21 /* UNEXPECTED_QUESTION_MARK_INSTEAD_OF_TAG_NAME */]: "'<?' is allowed only in XML context.",
      [22 /* UNEXPECTED_SOLIDUS_IN_TAG */]: "Illegal '/' in tags.",
      // Vue-specific parse errors
      [23 /* X_INVALID_END_TAG */]: 'Invalid end tag.',
      [24 /* X_MISSING_END_TAG */]: 'Element is missing end tag.',
      [25 /* X_MISSING_INTERPOLATION_END */]: 'Interpolation end sign was not found.',
      [26 /* X_MISSING_DYNAMIC_DIRECTIVE_ARGUMENT_END */]: 'End bracket for dynamic directive argument was not found. ' +
          'Note that dynamic directive argument cannot contain spaces.',
      // transform errors
      [27 /* X_V_IF_NO_EXPRESSION */]: `v-if/v-else-if is missing expression.`,
      [28 /* X_V_IF_SAME_KEY */]: `v-if/else branches must use unique keys.`,
      [29 /* X_V_ELSE_NO_ADJACENT_IF */]: `v-else/v-else-if has no adjacent v-if.`,
      [30 /* X_V_FOR_NO_EXPRESSION */]: `v-for is missing expression.`,
      [31 /* X_V_FOR_MALFORMED_EXPRESSION */]: `v-for has invalid expression.`,
      [32 /* X_V_FOR_TEMPLATE_KEY_PLACEMENT */]: `<template v-for> key should be placed on the <template> tag.`,
      [33 /* X_V_BIND_NO_EXPRESSION */]: `v-bind is missing expression.`,
      [34 /* X_V_ON_NO_EXPRESSION */]: `v-on is missing expression.`,
      [35 /* X_V_SLOT_UNEXPECTED_DIRECTIVE_ON_SLOT_OUTLET */]: `Unexpected custom directive on <slot> outlet.`,
      [36 /* X_V_SLOT_MIXED_SLOT_USAGE */]: `Mixed v-slot usage on both the component and nested <template>.` +
          `When there are multiple named slots, all slots should use <template> ` +
          `syntax to avoid scope ambiguity.`,
      [37 /* X_V_SLOT_DUPLICATE_SLOT_NAMES */]: `Duplicate slot names found. `,
      [38 /* X_V_SLOT_EXTRANEOUS_DEFAULT_SLOT_CHILDREN */]: `Extraneous children found when component already has explicitly named ` +
          `default slot. These children will be ignored.`,
      [39 /* X_V_SLOT_MISPLACED */]: `v-slot can only be used on components or <template> tags.`,
      [40 /* X_V_MODEL_NO_EXPRESSION */]: `v-model is missing expression.`,
      [41 /* X_V_MODEL_MALFORMED_EXPRESSION */]: `v-model value must be a valid JavaScript member expression.`,
      [42 /* X_V_MODEL_ON_SCOPE_VARIABLE */]: `v-model cannot be used on v-for or v-slot scope variables because they are not writable.`,
      [43 /* X_INVALID_EXPRESSION */]: `Error parsing JavaScript expression: `,
      [44 /* X_KEEP_ALIVE_INVALID_CHILDREN */]: `<KeepAlive> expects exactly one child component.`,
      // generic errors
      [45 /* X_PREFIX_ID_NOT_SUPPORTED */]: `"prefixIdentifiers" option is not supported in this build of compiler.`,
      [46 /* X_MODULE_MODE_NOT_SUPPORTED */]: `ES module mode is not supported in this build of compiler.`,
      [47 /* X_CACHE_HANDLER_NOT_SUPPORTED */]: `"cacheHandlers" option is only supported when the "prefixIdentifiers" option is enabled.`,
      [48 /* X_SCOPE_ID_NOT_SUPPORTED */]: `"scopeId" option is only supported in module mode.`
  };

  const FRAGMENT = Symbol(`Fragment` );
  const TELEPORT = Symbol(`Teleport` );
  const SUSPENSE = Symbol(`Suspense` );
  const KEEP_ALIVE = Symbol(`KeepAlive` );
  const BASE_TRANSITION = Symbol(`BaseTransition` );
  const OPEN_BLOCK = Symbol(`openBlock` );
  const CREATE_BLOCK = Symbol(`createBlock` );
  const CREATE_VNODE = Symbol(`createVNode` );
  const CREATE_COMMENT = Symbol(`createCommentVNode` );
  const CREATE_TEXT = Symbol(`createTextVNode` );
  const CREATE_STATIC = Symbol(`createStaticVNode` );
  const RESOLVE_COMPONENT = Symbol(`resolveComponent` );
  const RESOLVE_DYNAMIC_COMPONENT = Symbol(`resolveDynamicComponent` );
  const RESOLVE_DIRECTIVE = Symbol(`resolveDirective` );
  const WITH_DIRECTIVES = Symbol(`withDirectives` );
  const RENDER_LIST = Symbol(`renderList` );
  const RENDER_SLOT = Symbol(`renderSlot` );
  const CREATE_SLOTS = Symbol(`createSlots` );
  const TO_DISPLAY_STRING = Symbol(`toDisplayString` );
  const MERGE_PROPS = Symbol(`mergeProps` );
  const TO_HANDLERS = Symbol(`toHandlers` );
  const CAMELIZE = Symbol(`camelize` );
  const CAPITALIZE = Symbol(`capitalize` );
  const TO_HANDLER_KEY = Symbol(`toHandlerKey` );
  const SET_BLOCK_TRACKING = Symbol(`setBlockTracking` );
  const PUSH_SCOPE_ID = Symbol(`pushScopeId` );
  const POP_SCOPE_ID = Symbol(`popScopeId` );
  const WITH_SCOPE_ID = Symbol(`withScopeId` );
  const WITH_CTX = Symbol(`withCtx` );
  const UNREF = Symbol(`unref` );
  const IS_REF = Symbol(`isRef` );
  // Name mapping for runtime helpers that need to be imported from 'vue' in
  // generated code. Make sure these are correctly exported in the runtime!
  // Using `any` here because TS doesn't allow symbols as index type.
  const helperNameMap = {
      [FRAGMENT]: `Fragment`,
      [TELEPORT]: `Teleport`,
      [SUSPENSE]: `Suspense`,
      [KEEP_ALIVE]: `KeepAlive`,
      [BASE_TRANSITION]: `BaseTransition`,
      [OPEN_BLOCK]: `openBlock`,
      [CREATE_BLOCK]: `createBlock`,
      [CREATE_VNODE]: `createVNode`,
      [CREATE_COMMENT]: `createCommentVNode`,
      [CREATE_TEXT]: `createTextVNode`,
      [CREATE_STATIC]: `createStaticVNode`,
      [RESOLVE_COMPONENT]: `resolveComponent`,
      [RESOLVE_DYNAMIC_COMPONENT]: `resolveDynamicComponent`,
      [RESOLVE_DIRECTIVE]: `resolveDirective`,
      [WITH_DIRECTIVES]: `withDirectives`,
      [RENDER_LIST]: `renderList`,
      [RENDER_SLOT]: `renderSlot`,
      [CREATE_SLOTS]: `createSlots`,
      [TO_DISPLAY_STRING]: `toDisplayString`,
      [MERGE_PROPS]: `mergeProps`,
      [TO_HANDLERS]: `toHandlers`,
      [CAMELIZE]: `camelize`,
      [CAPITALIZE]: `capitalize`,
      [TO_HANDLER_KEY]: `toHandlerKey`,
      [SET_BLOCK_TRACKING]: `setBlockTracking`,
      [PUSH_SCOPE_ID]: `pushScopeId`,
      [POP_SCOPE_ID]: `popScopeId`,
      [WITH_SCOPE_ID]: `withScopeId`,
      [WITH_CTX]: `withCtx`,
      [UNREF]: `unref`,
      [IS_REF]: `isRef`
  };
  function registerRuntimeHelpers(helpers) {
      Object.getOwnPropertySymbols(helpers).forEach(s => {
          helperNameMap[s] = helpers[s];
      });
  }

  // AST Utilities ---------------------------------------------------------------
  // Some expressions, e.g. sequence and conditional expressions, are never
  // associated with template nodes, so their source locations are just a stub.
  // Container types like CompoundExpression also don't need a real location.
  const locStub = {
      source: '',
      start: { line: 1, column: 1, offset: 0 },
      end: { line: 1, column: 1, offset: 0 }
  };
  function createRoot(children, loc = locStub) {
      return {
          type: 0 /* ROOT */,
          children,
          helpers: [],
          components: [],
          directives: [],
          hoists: [],
          imports: [],
          cached: 0,
          temps: 0,
          codegenNode: undefined,
          loc
      };
  }
  function createVNodeCall(context, tag, props, children, patchFlag, dynamicProps, directives, isBlock = false, disableTracking = false, loc = locStub) {
      if (context) {
          if (isBlock) {
              context.helper(OPEN_BLOCK);
              context.helper(CREATE_BLOCK);
          }
          else {
              context.helper(CREATE_VNODE);
          }
          if (directives) {
              context.helper(WITH_DIRECTIVES);
          }
      }
      return {
          type: 13 /* VNODE_CALL */,
          tag,
          props,
          children,
          patchFlag,
          dynamicProps,
          directives,
          isBlock,
          disableTracking,
          loc
      };
  }
  function createArrayExpression(elements, loc = locStub) {
      return {
          type: 17 /* JS_ARRAY_EXPRESSION */,
          loc,
          elements
      };
  }
  function createObjectExpression(properties, loc = locStub) {
      return {
          type: 15 /* JS_OBJECT_EXPRESSION */,
          loc,
          properties
      };
  }
  function createObjectProperty(key, value) {
      return {
          type: 16 /* JS_PROPERTY */,
          loc: locStub,
          key: isString(key) ? createSimpleExpression(key, true) : key,
          value
      };
  }
  function createSimpleExpression(content, isStatic, loc = locStub, constType = 0 /* NOT_CONSTANT */) {
      return {
          type: 4 /* SIMPLE_EXPRESSION */,
          loc,
          content,
          isStatic,
          constType: isStatic ? 3 /* CAN_STRINGIFY */ : constType
      };
  }
  function createCompoundExpression(children, loc = locStub) {
      return {
          type: 8 /* COMPOUND_EXPRESSION */,
          loc,
          children
      };
  }
  function createCallExpression(callee, args = [], loc = locStub) {
      return {
          type: 14 /* JS_CALL_EXPRESSION */,
          loc,
          callee,
          arguments: args
      };
  }
  function createFunctionExpression(params, returns = undefined, newline = false, isSlot = false, loc = locStub) {
      return {
          type: 18 /* JS_FUNCTION_EXPRESSION */,
          params,
          returns,
          newline,
          isSlot,
          loc
      };
  }
  function createConditionalExpression(test, consequent, alternate, newline = true) {
      return {
          type: 19 /* JS_CONDITIONAL_EXPRESSION */,
          test,
          consequent,
          alternate,
          newline,
          loc: locStub
      };
  }
  function createCacheExpression(index, value, isVNode = false) {
      return {
          type: 20 /* JS_CACHE_EXPRESSION */,
          index,
          value,
          isVNode,
          loc: locStub
      };
  }

  const isStaticExp = (p) => p.type === 4 /* SIMPLE_EXPRESSION */ && p.isStatic;
  const isBuiltInType = (tag, expected) => tag === expected || tag === hyphenate(expected);
  function isCoreComponent(tag) {
      if (isBuiltInType(tag, 'Teleport')) {
          return TELEPORT;
      }
      else if (isBuiltInType(tag, 'Suspense')) {
          return SUSPENSE;
      }
      else if (isBuiltInType(tag, 'KeepAlive')) {
          return KEEP_ALIVE;
      }
      else if (isBuiltInType(tag, 'BaseTransition')) {
          return BASE_TRANSITION;
      }
  }
  const nonIdentifierRE = /^\d|[^\$\w]/;
  const isSimpleIdentifier = (name) => !nonIdentifierRE.test(name);
  const memberExpRE = /^[A-Za-z_$\xA0-\uFFFF][\w$\xA0-\uFFFF]*(?:\s*\.\s*[A-Za-z_$\xA0-\uFFFF][\w$\xA0-\uFFFF]*|\[[^\]]+\])*$/;
  const isMemberExpression = (path) => {
      if (!path)
          return false;
      return memberExpRE.test(path.trim());
  };
  function getInnerRange(loc, offset, length) {
      const source = loc.source.substr(offset, length);
      const newLoc = {
          source,
          start: advancePositionWithClone(loc.start, loc.source, offset),
          end: loc.end
      };
      if (length != null) {
          newLoc.end = advancePositionWithClone(loc.start, loc.source, offset + length);
      }
      return newLoc;
  }
  function advancePositionWithClone(pos, source, numberOfCharacters = source.length) {
      return advancePositionWithMutation(extend({}, pos), source, numberOfCharacters);
  }
  // advance by mutation without cloning (for performance reasons), since this
  // gets called a lot in the parser
  function advancePositionWithMutation(pos, source, numberOfCharacters = source.length) {
      let linesCount = 0;
      let lastNewLinePos = -1;
      for (let i = 0; i < numberOfCharacters; i++) {
          if (source.charCodeAt(i) === 10 /* newline char code */) {
              linesCount++;
              lastNewLinePos = i;
          }
      }
      pos.offset += numberOfCharacters;
      pos.line += linesCount;
      pos.column =
          lastNewLinePos === -1
              ? pos.column + numberOfCharacters
              : numberOfCharacters - lastNewLinePos;
      return pos;
  }
  function assert(condition, msg) {
      /* istanbul ignore if */
      if (!condition) {
          throw new Error(msg || `unexpected compiler condition`);
      }
  }
  function findDir(node, name, allowEmpty = false) {
      for (let i = 0; i < node.props.length; i++) {
          const p = node.props[i];
          if (p.type === 7 /* DIRECTIVE */ &&
              (allowEmpty || p.exp) &&
              (isString(name) ? p.name === name : name.test(p.name))) {
              return p;
          }
      }
  }
  function findProp(node, name, dynamicOnly = false, allowEmpty = false) {
      for (let i = 0; i < node.props.length; i++) {
          const p = node.props[i];
          if (p.type === 6 /* ATTRIBUTE */) {
              if (dynamicOnly)
                  continue;
              if (p.name === name && (p.value || allowEmpty)) {
                  return p;
              }
          }
          else if (p.name === 'bind' &&
              (p.exp || allowEmpty) &&
              isBindKey(p.arg, name)) {
              return p;
          }
      }
  }
  function isBindKey(arg, name) {
      return !!(arg && isStaticExp(arg) && arg.content === name);
  }
  function hasDynamicKeyVBind(node) {
      return node.props.some(p => p.type === 7 /* DIRECTIVE */ &&
          p.name === 'bind' &&
          (!p.arg || // v-bind="obj"
              p.arg.type !== 4 /* SIMPLE_EXPRESSION */ || // v-bind:[_ctx.foo]
              !p.arg.isStatic) // v-bind:[foo]
      );
  }
  function isText(node) {
      return node.type === 5 /* INTERPOLATION */ || node.type === 2 /* TEXT */;
  }
  function isVSlot(p) {
      return p.type === 7 /* DIRECTIVE */ && p.name === 'slot';
  }
  function isTemplateNode(node) {
      return (node.type === 1 /* ELEMENT */ && node.tagType === 3 /* TEMPLATE */);
  }
  function isSlotOutlet(node) {
      return node.type === 1 /* ELEMENT */ && node.tagType === 2 /* SLOT */;
  }
  function injectProp(node, prop, context) {
      let propsWithInjection;
      const props = node.type === 13 /* VNODE_CALL */ ? node.props : node.arguments[2];
      if (props == null || isString(props)) {
          propsWithInjection = createObjectExpression([prop]);
      }
      else if (props.type === 14 /* JS_CALL_EXPRESSION */) {
          // merged props... add ours
          // only inject key to object literal if it's the first argument so that
          // if doesn't override user provided keys
          const first = props.arguments[0];
          if (!isString(first) && first.type === 15 /* JS_OBJECT_EXPRESSION */) {
              first.properties.unshift(prop);
          }
          else {
              if (props.callee === TO_HANDLERS) {
                  // #2366
                  propsWithInjection = createCallExpression(context.helper(MERGE_PROPS), [
                      createObjectExpression([prop]),
                      props
                  ]);
              }
              else {
                  props.arguments.unshift(createObjectExpression([prop]));
              }
          }
          !propsWithInjection && (propsWithInjection = props);
      }
      else if (props.type === 15 /* JS_OBJECT_EXPRESSION */) {
          let alreadyExists = false;
          // check existing key to avoid overriding user provided keys
          if (prop.key.type === 4 /* SIMPLE_EXPRESSION */) {
              const propKeyName = prop.key.content;
              alreadyExists = props.properties.some(p => p.key.type === 4 /* SIMPLE_EXPRESSION */ &&
                  p.key.content === propKeyName);
          }
          if (!alreadyExists) {
              props.properties.unshift(prop);
          }
          propsWithInjection = props;
      }
      else {
          // single v-bind with expression, return a merged replacement
          propsWithInjection = createCallExpression(context.helper(MERGE_PROPS), [
              createObjectExpression([prop]),
              props
          ]);
      }
      if (node.type === 13 /* VNODE_CALL */) {
          node.props = propsWithInjection;
      }
      else {
          node.arguments[2] = propsWithInjection;
      }
  }
  function toValidAssetId(name, type) {
      return `_${type}_${name.replace(/[^\w]/g, '_')}`;
  }

  // The default decoder only provides escapes for characters reserved as part of
  // the template syntax, and is only used if the custom renderer did not provide
  // a platform-specific decoder.
  const decodeRE = /&(gt|lt|amp|apos|quot);/g;
  const decodeMap = {
      gt: '>',
      lt: '<',
      amp: '&',
      apos: "'",
      quot: '"'
  };
  const defaultParserOptions = {
      delimiters: [`{{`, `}}`],
      getNamespace: () => 0 /* HTML */,
      getTextMode: () => 0 /* DATA */,
      isVoidTag: NO,
      isPreTag: NO,
      isCustomElement: NO,
      decodeEntities: (rawText) => rawText.replace(decodeRE, (_, p1) => decodeMap[p1]),
      onError: defaultOnError,
      comments: false
  };
  function baseParse(content, options = {}) {
      const context = createParserContext(content, options);
      const start = getCursor(context);
      return createRoot(parseChildren(context, 0 /* DATA */, []), getSelection(context, start));
  }
  function createParserContext(content, rawOptions) {
      const options = extend({}, defaultParserOptions);
      for (const key in rawOptions) {
          // @ts-ignore
          options[key] = rawOptions[key] || defaultParserOptions[key];
      }
      return {
          options,
          column: 1,
          line: 1,
          offset: 0,
          originalSource: content,
          source: content,
          inPre: false,
          inVPre: false
      };
  }
  function parseChildren(context, mode, ancestors) {
      const parent = last(ancestors);
      const ns = parent ? parent.ns : 0 /* HTML */;
      const nodes = [];
      while (!isEnd(context, mode, ancestors)) {
          const s = context.source;
          let node = undefined;
          if (mode === 0 /* DATA */ || mode === 1 /* RCDATA */) {
              if (!context.inVPre && startsWith(s, context.options.delimiters[0])) {
                  // '{{'
                  node = parseInterpolation(context, mode);
              }
              else if (mode === 0 /* DATA */ && s[0] === '<') {
                  // https://html.spec.whatwg.org/multipage/parsing.html#tag-open-state
                  if (s.length === 1) {
                      emitError(context, 5 /* EOF_BEFORE_TAG_NAME */, 1);
                  }
                  else if (s[1] === '!') {
                      // https://html.spec.whatwg.org/multipage/parsing.html#markup-declaration-open-state
                      if (startsWith(s, '<!--')) {
                          node = parseComment(context);
                      }
                      else if (startsWith(s, '<!DOCTYPE')) {
                          // Ignore DOCTYPE by a limitation.
                          node = parseBogusComment(context);
                      }
                      else if (startsWith(s, '<![CDATA[')) {
                          if (ns !== 0 /* HTML */) {
                              node = parseCDATA(context, ancestors);
                          }
                          else {
                              emitError(context, 1 /* CDATA_IN_HTML_CONTENT */);
                              node = parseBogusComment(context);
                          }
                      }
                      else {
                          emitError(context, 11 /* INCORRECTLY_OPENED_COMMENT */);
                          node = parseBogusComment(context);
                      }
                  }
                  else if (s[1] === '/') {
                      // https://html.spec.whatwg.org/multipage/parsing.html#end-tag-open-state
                      if (s.length === 2) {
                          emitError(context, 5 /* EOF_BEFORE_TAG_NAME */, 2);
                      }
                      else if (s[2] === '>') {
                          emitError(context, 14 /* MISSING_END_TAG_NAME */, 2);
                          advanceBy(context, 3);
                          continue;
                      }
                      else if (/[a-z]/i.test(s[2])) {
                          emitError(context, 23 /* X_INVALID_END_TAG */);
                          parseTag(context, 1 /* End */, parent);
                          continue;
                      }
                      else {
                          emitError(context, 12 /* INVALID_FIRST_CHARACTER_OF_TAG_NAME */, 2);
                          node = parseBogusComment(context);
                      }
                  }
                  else if (/[a-z]/i.test(s[1])) {
                      node = parseElement(context, ancestors);
                  }
                  else if (s[1] === '?') {
                      emitError(context, 21 /* UNEXPECTED_QUESTION_MARK_INSTEAD_OF_TAG_NAME */, 1);
                      node = parseBogusComment(context);
                  }
                  else {
                      emitError(context, 12 /* INVALID_FIRST_CHARACTER_OF_TAG_NAME */, 1);
                  }
              }
          }
          if (!node) {
              node = parseText(context, mode);
          }
          if (isArray(node)) {
              for (let i = 0; i < node.length; i++) {
                  pushNode(nodes, node[i]);
              }
          }
          else {
              pushNode(nodes, node);
          }
      }
      // Whitespace management for more efficient output
      // (same as v2 whitespace: 'condense')
      let removedWhitespace = false;
      if (mode !== 2 /* RAWTEXT */ && mode !== 1 /* RCDATA */) {
          for (let i = 0; i < nodes.length; i++) {
              const node = nodes[i];
              if (!context.inPre && node.type === 2 /* TEXT */) {
                  if (!/[^\t\r\n\f ]/.test(node.content)) {
                      const prev = nodes[i - 1];
                      const next = nodes[i + 1];
                      // If:
                      // - the whitespace is the first or last node, or:
                      // - the whitespace is adjacent to a comment, or:
                      // - the whitespace is between two elements AND contains newline
                      // Then the whitespace is ignored.
                      if (!prev ||
                          !next ||
                          prev.type === 3 /* COMMENT */ ||
                          next.type === 3 /* COMMENT */ ||
                          (prev.type === 1 /* ELEMENT */ &&
                              next.type === 1 /* ELEMENT */ &&
                              /[\r\n]/.test(node.content))) {
                          removedWhitespace = true;
                          nodes[i] = null;
                      }
                      else {
                          // Otherwise, condensed consecutive whitespace inside the text
                          // down to a single space
                          node.content = ' ';
                      }
                  }
                  else {
                      node.content = node.content.replace(/[\t\r\n\f ]+/g, ' ');
                  }
              }
          }
          if (context.inPre && parent && context.options.isPreTag(parent.tag)) {
              // remove leading newline per html spec
              // https://html.spec.whatwg.org/multipage/grouping-content.html#the-pre-element
              const first = nodes[0];
              if (first && first.type === 2 /* TEXT */) {
                  first.content = first.content.replace(/^\r?\n/, '');
              }
          }
      }
      return removedWhitespace ? nodes.filter(Boolean) : nodes;
  }
  function pushNode(nodes, node) {
      if (node.type === 2 /* TEXT */) {
          const prev = last(nodes);
          // Merge if both this and the previous node are text and those are
          // consecutive. This happens for cases like "a < b".
          if (prev &&
              prev.type === 2 /* TEXT */ &&
              prev.loc.end.offset === node.loc.start.offset) {
              prev.content += node.content;
              prev.loc.end = node.loc.end;
              prev.loc.source += node.loc.source;
              return;
          }
      }
      nodes.push(node);
  }
  function parseCDATA(context, ancestors) {
      advanceBy(context, 9);
      const nodes = parseChildren(context, 3 /* CDATA */, ancestors);
      if (context.source.length === 0) {
          emitError(context, 6 /* EOF_IN_CDATA */);
      }
      else {
          advanceBy(context, 3);
      }
      return nodes;
  }
  function parseComment(context) {
      const start = getCursor(context);
      let content;
      // Regular comment.
      const match = /--(\!)?>/.exec(context.source);
      if (!match) {
          content = context.source.slice(4);
          advanceBy(context, context.source.length);
          emitError(context, 7 /* EOF_IN_COMMENT */);
      }
      else {
          if (match.index <= 3) {
              emitError(context, 0 /* ABRUPT_CLOSING_OF_EMPTY_COMMENT */);
          }
          if (match[1]) {
              emitError(context, 10 /* INCORRECTLY_CLOSED_COMMENT */);
          }
          content = context.source.slice(4, match.index);
          // Advancing with reporting nested comments.
          const s = context.source.slice(0, match.index);
          let prevIndex = 1, nestedIndex = 0;
          while ((nestedIndex = s.indexOf('<!--', prevIndex)) !== -1) {
              advanceBy(context, nestedIndex - prevIndex + 1);
              if (nestedIndex + 4 < s.length) {
                  emitError(context, 16 /* NESTED_COMMENT */);
              }
              prevIndex = nestedIndex + 1;
          }
          advanceBy(context, match.index + match[0].length - prevIndex + 1);
      }
      return {
          type: 3 /* COMMENT */,
          content,
          loc: getSelection(context, start)
      };
  }
  function parseBogusComment(context) {
      const start = getCursor(context);
      const contentStart = context.source[1] === '?' ? 1 : 2;
      let content;
      const closeIndex = context.source.indexOf('>');
      if (closeIndex === -1) {
          content = context.source.slice(contentStart);
          advanceBy(context, context.source.length);
      }
      else {
          content = context.source.slice(contentStart, closeIndex);
          advanceBy(context, closeIndex + 1);
      }
      return {
          type: 3 /* COMMENT */,
          content,
          loc: getSelection(context, start)
      };
  }
  function parseElement(context, ancestors) {
      // Start tag.
      const wasInPre = context.inPre;
      const wasInVPre = context.inVPre;
      const parent = last(ancestors);
      const element = parseTag(context, 0 /* Start */, parent);
      const isPreBoundary = context.inPre && !wasInPre;
      const isVPreBoundary = context.inVPre && !wasInVPre;
      if (element.isSelfClosing || context.options.isVoidTag(element.tag)) {
          return element;
      }
      // Children.
      ancestors.push(element);
      const mode = context.options.getTextMode(element, parent);
      const children = parseChildren(context, mode, ancestors);
      ancestors.pop();
      element.children = children;
      // End tag.
      if (startsWithEndTagOpen(context.source, element.tag)) {
          parseTag(context, 1 /* End */, parent);
      }
      else {
          emitError(context, 24 /* X_MISSING_END_TAG */, 0, element.loc.start);
          if (context.source.length === 0 && element.tag.toLowerCase() === 'script') {
              const first = children[0];
              if (first && startsWith(first.loc.source, '<!--')) {
                  emitError(context, 8 /* EOF_IN_SCRIPT_HTML_COMMENT_LIKE_TEXT */);
              }
          }
      }
      element.loc = getSelection(context, element.loc.start);
      if (isPreBoundary) {
          context.inPre = false;
      }
      if (isVPreBoundary) {
          context.inVPre = false;
      }
      return element;
  }
  const isSpecialTemplateDirective = /*#__PURE__*/ makeMap(`if,else,else-if,for,slot`);
  /**
   * Parse a tag (E.g. `<div id=a>`) with that type (start tag or end tag).
   */
  function parseTag(context, type, parent) {
      // Tag open.
      const start = getCursor(context);
      const match = /^<\/?([a-z][^\t\r\n\f />]*)/i.exec(context.source);
      const tag = match[1];
      const ns = context.options.getNamespace(tag, parent);
      advanceBy(context, match[0].length);
      advanceSpaces(context);
      // save current state in case we need to re-parse attributes with v-pre
      const cursor = getCursor(context);
      const currentSource = context.source;
      // Attributes.
      let props = parseAttributes(context, type);
      // check <pre> tag
      if (context.options.isPreTag(tag)) {
          context.inPre = true;
      }
      // check v-pre
      if (!context.inVPre &&
          props.some(p => p.type === 7 /* DIRECTIVE */ && p.name === 'pre')) {
          context.inVPre = true;
          // reset context
          extend(context, cursor);
          context.source = currentSource;
          // re-parse attrs and filter out v-pre itself
          props = parseAttributes(context, type).filter(p => p.name !== 'v-pre');
      }
      // Tag close.
      let isSelfClosing = false;
      if (context.source.length === 0) {
          emitError(context, 9 /* EOF_IN_TAG */);
      }
      else {
          isSelfClosing = startsWith(context.source, '/>');
          if (type === 1 /* End */ && isSelfClosing) {
              emitError(context, 4 /* END_TAG_WITH_TRAILING_SOLIDUS */);
          }
          advanceBy(context, isSelfClosing ? 2 : 1);
      }
      let tagType = 0 /* ELEMENT */;
      const options = context.options;
      if (!context.inVPre && !options.isCustomElement(tag)) {
          const hasVIs = props.some(p => p.type === 7 /* DIRECTIVE */ && p.name === 'is');
          if (options.isNativeTag && !hasVIs) {
              if (!options.isNativeTag(tag))
                  tagType = 1 /* COMPONENT */;
          }
          else if (hasVIs ||
              isCoreComponent(tag) ||
              (options.isBuiltInComponent && options.isBuiltInComponent(tag)) ||
              /^[A-Z]/.test(tag) ||
              tag === 'component') {
              tagType = 1 /* COMPONENT */;
          }
          if (tag === 'slot') {
              tagType = 2 /* SLOT */;
          }
          else if (tag === 'template' &&
              props.some(p => {
                  return (p.type === 7 /* DIRECTIVE */ && isSpecialTemplateDirective(p.name));
              })) {
              tagType = 3 /* TEMPLATE */;
          }
      }
      return {
          type: 1 /* ELEMENT */,
          ns,
          tag,
          tagType,
          props,
          isSelfClosing,
          children: [],
          loc: getSelection(context, start),
          codegenNode: undefined // to be created during transform phase
      };
  }
  function parseAttributes(context, type) {
      const props = [];
      const attributeNames = new Set();
      while (context.source.length > 0 &&
          !startsWith(context.source, '>') &&
          !startsWith(context.source, '/>')) {
          if (startsWith(context.source, '/')) {
              emitError(context, 22 /* UNEXPECTED_SOLIDUS_IN_TAG */);
              advanceBy(context, 1);
              advanceSpaces(context);
              continue;
          }
          if (type === 1 /* End */) {
              emitError(context, 3 /* END_TAG_WITH_ATTRIBUTES */);
          }
          const attr = parseAttribute(context, attributeNames);
          if (type === 0 /* Start */) {
              props.push(attr);
          }
          if (/^[^\t\r\n\f />]/.test(context.source)) {
              emitError(context, 15 /* MISSING_WHITESPACE_BETWEEN_ATTRIBUTES */);
          }
          advanceSpaces(context);
      }
      return props;
  }
  function parseAttribute(context, nameSet) {
      // Name.
      const start = getCursor(context);
      const match = /^[^\t\r\n\f />][^\t\r\n\f />=]*/.exec(context.source);
      const name = match[0];
      if (nameSet.has(name)) {
          emitError(context, 2 /* DUPLICATE_ATTRIBUTE */);
      }
      nameSet.add(name);
      if (name[0] === '=') {
          emitError(context, 19 /* UNEXPECTED_EQUALS_SIGN_BEFORE_ATTRIBUTE_NAME */);
      }
      {
          const pattern = /["'<]/g;
          let m;
          while ((m = pattern.exec(name))) {
              emitError(context, 17 /* UNEXPECTED_CHARACTER_IN_ATTRIBUTE_NAME */, m.index);
          }
      }
      advanceBy(context, name.length);
      // Value
      let value = undefined;
      if (/^[\t\r\n\f ]*=/.test(context.source)) {
          advanceSpaces(context);
          advanceBy(context, 1);
          advanceSpaces(context);
          value = parseAttributeValue(context);
          if (!value) {
              emitError(context, 13 /* MISSING_ATTRIBUTE_VALUE */);
          }
      }
      const loc = getSelection(context, start);
      if (!context.inVPre && /^(v-|:|@|#)/.test(name)) {
          const match = /(?:^v-([a-z0-9-]+))?(?:(?::|^@|^#)(\[[^\]]+\]|[^\.]+))?(.+)?$/i.exec(name);
          const dirName = match[1] ||
              (startsWith(name, ':') ? 'bind' : startsWith(name, '@') ? 'on' : 'slot');
          let arg;
          if (match[2]) {
              const isSlot = dirName === 'slot';
              const startOffset = name.lastIndexOf(match[2]);
              const loc = getSelection(context, getNewPosition(context, start, startOffset), getNewPosition(context, start, startOffset + match[2].length + ((isSlot && match[3]) || '').length));
              let content = match[2];
              let isStatic = true;
              if (content.startsWith('[')) {
                  isStatic = false;
                  if (!content.endsWith(']')) {
                      emitError(context, 26 /* X_MISSING_DYNAMIC_DIRECTIVE_ARGUMENT_END */);
                  }
                  content = content.substr(1, content.length - 2);
              }
              else if (isSlot) {
                  // #1241 special case for v-slot: vuetify relies extensively on slot
                  // names containing dots. v-slot doesn't have any modifiers and Vue 2.x
                  // supports such usage so we are keeping it consistent with 2.x.
                  content += match[3] || '';
              }
              arg = {
                  type: 4 /* SIMPLE_EXPRESSION */,
                  content,
                  isStatic,
                  constType: isStatic
                      ? 3 /* CAN_STRINGIFY */
                      : 0 /* NOT_CONSTANT */,
                  loc
              };
          }
          if (value && value.isQuoted) {
              const valueLoc = value.loc;
              valueLoc.start.offset++;
              valueLoc.start.column++;
              valueLoc.end = advancePositionWithClone(valueLoc.start, value.content);
              valueLoc.source = valueLoc.source.slice(1, -1);
          }
          return {
              type: 7 /* DIRECTIVE */,
              name: dirName,
              exp: value && {
                  type: 4 /* SIMPLE_EXPRESSION */,
                  content: value.content,
                  isStatic: false,
                  // Treat as non-constant by default. This can be potentially set to
                  // other values by `transformExpression` to make it eligible for hoisting.
                  constType: 0 /* NOT_CONSTANT */,
                  loc: value.loc
              },
              arg,
              modifiers: match[3] ? match[3].substr(1).split('.') : [],
              loc
          };
      }
      return {
          type: 6 /* ATTRIBUTE */,
          name,
          value: value && {
              type: 2 /* TEXT */,
              content: value.content,
              loc: value.loc
          },
          loc
      };
  }
  function parseAttributeValue(context) {
      const start = getCursor(context);
      let content;
      const quote = context.source[0];
      const isQuoted = quote === `"` || quote === `'`;
      if (isQuoted) {
          // Quoted value.
          advanceBy(context, 1);
          const endIndex = context.source.indexOf(quote);
          if (endIndex === -1) {
              content = parseTextData(context, context.source.length, 4 /* ATTRIBUTE_VALUE */);
          }
          else {
              content = parseTextData(context, endIndex, 4 /* ATTRIBUTE_VALUE */);
              advanceBy(context, 1);
          }
      }
      else {
          // Unquoted
          const match = /^[^\t\r\n\f >]+/.exec(context.source);
          if (!match) {
              return undefined;
          }
          const unexpectedChars = /["'<=`]/g;
          let m;
          while ((m = unexpectedChars.exec(match[0]))) {
              emitError(context, 18 /* UNEXPECTED_CHARACTER_IN_UNQUOTED_ATTRIBUTE_VALUE */, m.index);
          }
          content = parseTextData(context, match[0].length, 4 /* ATTRIBUTE_VALUE */);
      }
      return { content, isQuoted, loc: getSelection(context, start) };
  }
  function parseInterpolation(context, mode) {
      const [open, close] = context.options.delimiters;
      const closeIndex = context.source.indexOf(close, open.length);
      if (closeIndex === -1) {
          emitError(context, 25 /* X_MISSING_INTERPOLATION_END */);
          return undefined;
      }
      const start = getCursor(context);
      advanceBy(context, open.length);
      const innerStart = getCursor(context);
      const innerEnd = getCursor(context);
      const rawContentLength = closeIndex - open.length;
      const rawContent = context.source.slice(0, rawContentLength);
      const preTrimContent = parseTextData(context, rawContentLength, mode);
      const content = preTrimContent.trim();
      const startOffset = preTrimContent.indexOf(content);
      if (startOffset > 0) {
          advancePositionWithMutation(innerStart, rawContent, startOffset);
      }
      const endOffset = rawContentLength - (preTrimContent.length - content.length - startOffset);
      advancePositionWithMutation(innerEnd, rawContent, endOffset);
      advanceBy(context, close.length);
      return {
          type: 5 /* INTERPOLATION */,
          content: {
              type: 4 /* SIMPLE_EXPRESSION */,
              isStatic: false,
              // Set `isConstant` to false by default and will decide in transformExpression
              constType: 0 /* NOT_CONSTANT */,
              content,
              loc: getSelection(context, innerStart, innerEnd)
          },
          loc: getSelection(context, start)
      };
  }
  function parseText(context, mode) {
      const endTokens = ['<', context.options.delimiters[0]];
      if (mode === 3 /* CDATA */) {
          endTokens.push(']]>');
      }
      let endIndex = context.source.length;
      for (let i = 0; i < endTokens.length; i++) {
          const index = context.source.indexOf(endTokens[i], 1);
          if (index !== -1 && endIndex > index) {
              endIndex = index;
          }
      }
      const start = getCursor(context);
      const content = parseTextData(context, endIndex, mode);
      return {
          type: 2 /* TEXT */,
          content,
          loc: getSelection(context, start)
      };
  }
  /**
   * Get text data with a given length from the current location.
   * This translates HTML entities in the text data.
   */
  function parseTextData(context, length, mode) {
      const rawText = context.source.slice(0, length);
      advanceBy(context, length);
      if (mode === 2 /* RAWTEXT */ ||
          mode === 3 /* CDATA */ ||
          rawText.indexOf('&') === -1) {
          return rawText;
      }
      else {
          // DATA or RCDATA containing "&"". Entity decoding required.
          return context.options.decodeEntities(rawText, mode === 4 /* ATTRIBUTE_VALUE */);
      }
  }
  function getCursor(context) {
      const { column, line, offset } = context;
      return { column, line, offset };
  }
  function getSelection(context, start, end) {
      end = end || getCursor(context);
      return {
          start,
          end,
          source: context.originalSource.slice(start.offset, end.offset)
      };
  }
  function last(xs) {
      return xs[xs.length - 1];
  }
  function startsWith(source, searchString) {
      return source.startsWith(searchString);
  }
  function advanceBy(context, numberOfCharacters) {
      const { source } = context;
      advancePositionWithMutation(context, source, numberOfCharacters);
      context.source = source.slice(numberOfCharacters);
  }
  function advanceSpaces(context) {
      const match = /^[\t\r\n\f ]+/.exec(context.source);
      if (match) {
          advanceBy(context, match[0].length);
      }
  }
  function getNewPosition(context, start, numberOfCharacters) {
      return advancePositionWithClone(start, context.originalSource.slice(start.offset, numberOfCharacters), numberOfCharacters);
  }
  function emitError(context, code, offset, loc = getCursor(context)) {
      if (offset) {
          loc.offset += offset;
          loc.column += offset;
      }
      context.options.onError(createCompilerError(code, {
          start: loc,
          end: loc,
          source: ''
      }));
  }
  function isEnd(context, mode, ancestors) {
      const s = context.source;
      switch (mode) {
          case 0 /* DATA */:
              if (startsWith(s, '</')) {
                  // TODO: probably bad performance
                  for (let i = ancestors.length - 1; i >= 0; --i) {
                      if (startsWithEndTagOpen(s, ancestors[i].tag)) {
                          return true;
                      }
                  }
              }
              break;
          case 1 /* RCDATA */:
          case 2 /* RAWTEXT */: {
              const parent = last(ancestors);
              if (parent && startsWithEndTagOpen(s, parent.tag)) {
                  return true;
              }
              break;
          }
          case 3 /* CDATA */:
              if (startsWith(s, ']]>')) {
                  return true;
              }
              break;
      }
      return !s;
  }
  function startsWithEndTagOpen(source, tag) {
      return (startsWith(source, '</') &&
          source.substr(2, tag.length).toLowerCase() === tag.toLowerCase() &&
          /[\t\r\n\f />]/.test(source[2 + tag.length] || '>'));
  }

  function hoistStatic(root, context) {
      walk(root, context, 
      // Root node is unfortunately non-hoistable due to potential parent
      // fallthrough attributes.
      isSingleElementRoot(root, root.children[0]));
  }
  function isSingleElementRoot(root, child) {
      const { children } = root;
      return (children.length === 1 &&
          child.type === 1 /* ELEMENT */ &&
          !isSlotOutlet(child));
  }
  function walk(node, context, doNotHoistNode = false) {
      let hasHoistedNode = false;
      // Some transforms, e.g. transformAssetUrls from @vue/compiler-sfc, replaces
      // static bindings with expressions. These expressions are guaranteed to be
      // constant so they are still eligible for hoisting, but they are only
      // available at runtime and therefore cannot be evaluated ahead of time.
      // This is only a concern for pre-stringification (via transformHoist by
      // @vue/compiler-dom), but doing it here allows us to perform only one full
      // walk of the AST and allow `stringifyStatic` to stop walking as soon as its
      // stringficiation threshold is met.
      let canStringify = true;
      const { children } = node;
      for (let i = 0; i < children.length; i++) {
          const child = children[i];
          // only plain elements & text calls are eligible for hoisting.
          if (child.type === 1 /* ELEMENT */ &&
              child.tagType === 0 /* ELEMENT */) {
              const constantType = doNotHoistNode
                  ? 0 /* NOT_CONSTANT */
                  : getConstantType(child, context);
              if (constantType > 0 /* NOT_CONSTANT */) {
                  if (constantType < 3 /* CAN_STRINGIFY */) {
                      canStringify = false;
                  }
                  if (constantType >= 2 /* CAN_HOIST */) {
                      child.codegenNode.patchFlag =
                          -1 /* HOISTED */ + (` /* HOISTED */` );
                      child.codegenNode = context.hoist(child.codegenNode);
                      hasHoistedNode = true;
                      continue;
                  }
              }
              else {
                  // node may contain dynamic children, but its props may be eligible for
                  // hoisting.
                  const codegenNode = child.codegenNode;
                  if (codegenNode.type === 13 /* VNODE_CALL */) {
                      const flag = getPatchFlag(codegenNode);
                      if ((!flag ||
                          flag === 512 /* NEED_PATCH */ ||
                          flag === 1 /* TEXT */) &&
                          getGeneratedPropsConstantType(child, context) >=
                              2 /* CAN_HOIST */) {
                          const props = getNodeProps(child);
                          if (props) {
                              codegenNode.props = context.hoist(props);
                          }
                      }
                  }
              }
          }
          else if (child.type === 12 /* TEXT_CALL */) {
              const contentType = getConstantType(child.content, context);
              if (contentType > 0) {
                  if (contentType < 3 /* CAN_STRINGIFY */) {
                      canStringify = false;
                  }
                  if (contentType >= 2 /* CAN_HOIST */) {
                      child.codegenNode = context.hoist(child.codegenNode);
                      hasHoistedNode = true;
                  }
              }
          }
          // walk further
          if (child.type === 1 /* ELEMENT */) {
              const isComponent = child.tagType === 1 /* COMPONENT */;
              if (isComponent) {
                  context.scopes.vSlot++;
              }
              walk(child, context);
              if (isComponent) {
                  context.scopes.vSlot--;
              }
          }
          else if (child.type === 11 /* FOR */) {
              // Do not hoist v-for single child because it has to be a block
              walk(child, context, child.children.length === 1);
          }
          else if (child.type === 9 /* IF */) {
              for (let i = 0; i < child.branches.length; i++) {
                  // Do not hoist v-if single child because it has to be a block
                  walk(child.branches[i], context, child.branches[i].children.length === 1);
              }
          }
      }
      if (canStringify && hasHoistedNode && context.transformHoist) {
          context.transformHoist(children, context, node);
      }
  }
  function getConstantType(node, context) {
      const { constantCache } = context;
      switch (node.type) {
          case 1 /* ELEMENT */:
              if (node.tagType !== 0 /* ELEMENT */) {
                  return 0 /* NOT_CONSTANT */;
              }
              const cached = constantCache.get(node);
              if (cached !== undefined) {
                  return cached;
              }
              const codegenNode = node.codegenNode;
              if (codegenNode.type !== 13 /* VNODE_CALL */) {
                  return 0 /* NOT_CONSTANT */;
              }
              const flag = getPatchFlag(codegenNode);
              if (!flag) {
                  let returnType = 3 /* CAN_STRINGIFY */;
                  // Element itself has no patch flag. However we still need to check:
                  // 1. Even for a node with no patch flag, it is possible for it to contain
                  // non-hoistable expressions that refers to scope variables, e.g. compiler
                  // injected keys or cached event handlers. Therefore we need to always
                  // check the codegenNode's props to be sure.
                  const generatedPropsType = getGeneratedPropsConstantType(node, context);
                  if (generatedPropsType === 0 /* NOT_CONSTANT */) {
                      constantCache.set(node, 0 /* NOT_CONSTANT */);
                      return 0 /* NOT_CONSTANT */;
                  }
                  if (generatedPropsType < returnType) {
                      returnType = generatedPropsType;
                  }
                  // 2. its children.
                  for (let i = 0; i < node.children.length; i++) {
                      const childType = getConstantType(node.children[i], context);
                      if (childType === 0 /* NOT_CONSTANT */) {
                          constantCache.set(node, 0 /* NOT_CONSTANT */);
                          return 0 /* NOT_CONSTANT */;
                      }
                      if (childType < returnType) {
                          returnType = childType;
                      }
                  }
                  // 3. if the type is not already CAN_SKIP_PATCH which is the lowest non-0
                  // type, check if any of the props can cause the type to be lowered
                  // we can skip can_patch because it's guaranteed by the absence of a
                  // patchFlag.
                  if (returnType > 1 /* CAN_SKIP_PATCH */) {
                      for (let i = 0; i < node.props.length; i++) {
                          const p = node.props[i];
                          if (p.type === 7 /* DIRECTIVE */ && p.name === 'bind' && p.exp) {
                              const expType = getConstantType(p.exp, context);
                              if (expType === 0 /* NOT_CONSTANT */) {
                                  constantCache.set(node, 0 /* NOT_CONSTANT */);
                                  return 0 /* NOT_CONSTANT */;
                              }
                              if (expType < returnType) {
                                  returnType = expType;
                              }
                          }
                      }
                  }
                  // only svg/foreignObject could be block here, however if they are
                  // static then they don't need to be blocks since there will be no
                  // nested updates.
                  if (codegenNode.isBlock) {
                      context.removeHelper(OPEN_BLOCK);
                      context.removeHelper(CREATE_BLOCK);
                      codegenNode.isBlock = false;
                      context.helper(CREATE_VNODE);
                  }
                  constantCache.set(node, returnType);
                  return returnType;
              }
              else {
                  constantCache.set(node, 0 /* NOT_CONSTANT */);
                  return 0 /* NOT_CONSTANT */;
              }
          case 2 /* TEXT */:
          case 3 /* COMMENT */:
              return 3 /* CAN_STRINGIFY */;
          case 9 /* IF */:
          case 11 /* FOR */:
          case 10 /* IF_BRANCH */:
              return 0 /* NOT_CONSTANT */;
          case 5 /* INTERPOLATION */:
          case 12 /* TEXT_CALL */:
              return getConstantType(node.content, context);
          case 4 /* SIMPLE_EXPRESSION */:
              return node.constType;
          case 8 /* COMPOUND_EXPRESSION */:
              let returnType = 3 /* CAN_STRINGIFY */;
              for (let i = 0; i < node.children.length; i++) {
                  const child = node.children[i];
                  if (isString(child) || isSymbol(child)) {
                      continue;
                  }
                  const childType = getConstantType(child, context);
                  if (childType === 0 /* NOT_CONSTANT */) {
                      return 0 /* NOT_CONSTANT */;
                  }
                  else if (childType < returnType) {
                      returnType = childType;
                  }
              }
              return returnType;
          default:
              return 0 /* NOT_CONSTANT */;
      }
  }
  function getGeneratedPropsConstantType(node, context) {
      let returnType = 3 /* CAN_STRINGIFY */;
      const props = getNodeProps(node);
      if (props && props.type === 15 /* JS_OBJECT_EXPRESSION */) {
          const { properties } = props;
          for (let i = 0; i < properties.length; i++) {
              const { key, value } = properties[i];
              const keyType = getConstantType(key, context);
              if (keyType === 0 /* NOT_CONSTANT */) {
                  return keyType;
              }
              if (keyType < returnType) {
                  returnType = keyType;
              }
              if (value.type !== 4 /* SIMPLE_EXPRESSION */) {
                  return 0 /* NOT_CONSTANT */;
              }
              const valueType = getConstantType(value, context);
              if (valueType === 0 /* NOT_CONSTANT */) {
                  return valueType;
              }
              if (valueType < returnType) {
                  returnType = valueType;
              }
          }
      }
      return returnType;
  }
  function getNodeProps(node) {
      const codegenNode = node.codegenNode;
      if (codegenNode.type === 13 /* VNODE_CALL */) {
          return codegenNode.props;
      }
  }
  function getPatchFlag(node) {
      const flag = node.patchFlag;
      return flag ? parseInt(flag, 10) : undefined;
  }

  function createTransformContext(root, { filename = '', prefixIdentifiers = false, hoistStatic = false, cacheHandlers = false, nodeTransforms = [], directiveTransforms = {}, transformHoist = null, isBuiltInComponent = NOOP, isCustomElement = NOOP, expressionPlugins = [], scopeId = null, slotted = true, ssr = false, ssrCssVars = ``, bindingMetadata = EMPTY_OBJ, inline = false, isTS = false, onError = defaultOnError }) {
      const nameMatch = filename.replace(/\?.*$/, '').match(/([^/\\]+)\.\w+$/);
      const context = {
          // options
          selfName: nameMatch && capitalize(camelize(nameMatch[1])),
          prefixIdentifiers,
          hoistStatic,
          cacheHandlers,
          nodeTransforms,
          directiveTransforms,
          transformHoist,
          isBuiltInComponent,
          isCustomElement,
          expressionPlugins,
          scopeId,
          slotted,
          ssr,
          ssrCssVars,
          bindingMetadata,
          inline,
          isTS,
          onError,
          // state
          root,
          helpers: new Map(),
          components: new Set(),
          directives: new Set(),
          hoists: [],
          imports: [],
          constantCache: new Map(),
          temps: 0,
          cached: 0,
          identifiers: Object.create(null),
          scopes: {
              vFor: 0,
              vSlot: 0,
              vPre: 0,
              vOnce: 0
          },
          parent: null,
          currentNode: root,
          childIndex: 0,
          // methods
          helper(name) {
              const count = context.helpers.get(name) || 0;
              context.helpers.set(name, count + 1);
              return name;
          },
          removeHelper(name) {
              const count = context.helpers.get(name);
              if (count) {
                  const currentCount = count - 1;
                  if (!currentCount) {
                      context.helpers.delete(name);
                  }
                  else {
                      context.helpers.set(name, currentCount);
                  }
              }
          },
          helperString(name) {
              return `_${helperNameMap[context.helper(name)]}`;
          },
          replaceNode(node) {
              /* istanbul ignore if */
              {
                  if (!context.currentNode) {
                      throw new Error(`Node being replaced is already removed.`);
                  }
                  if (!context.parent) {
                      throw new Error(`Cannot replace root node.`);
                  }
              }
              context.parent.children[context.childIndex] = context.currentNode = node;
          },
          removeNode(node) {
              if (!context.parent) {
                  throw new Error(`Cannot remove root node.`);
              }
              const list = context.parent.children;
              const removalIndex = node
                  ? list.indexOf(node)
                  : context.currentNode
                      ? context.childIndex
                      : -1;
              /* istanbul ignore if */
              if (removalIndex < 0) {
                  throw new Error(`node being removed is not a child of current parent`);
              }
              if (!node || node === context.currentNode) {
                  // current node removed
                  context.currentNode = null;
                  context.onNodeRemoved();
              }
              else {
                  // sibling node removed
                  if (context.childIndex > removalIndex) {
                      context.childIndex--;
                      context.onNodeRemoved();
                  }
              }
              context.parent.children.splice(removalIndex, 1);
          },
          onNodeRemoved: () => { },
          addIdentifiers(exp) {
          },
          removeIdentifiers(exp) {
          },
          hoist(exp) {
              context.hoists.push(exp);
              const identifier = createSimpleExpression(`_hoisted_${context.hoists.length}`, false, exp.loc, 2 /* CAN_HOIST */);
              identifier.hoisted = exp;
              return identifier;
          },
          cache(exp, isVNode = false) {
              return createCacheExpression(++context.cached, exp, isVNode);
          }
      };
      return context;
  }
  function transform(root, options) {
      const context = createTransformContext(root, options);
      traverseNode(root, context);
      if (options.hoistStatic) {
          hoistStatic(root, context);
      }
      if (!options.ssr) {
          createRootCodegen(root, context);
      }
      // finalize meta information
      root.helpers = [...context.helpers.keys()];
      root.components = [...context.components];
      root.directives = [...context.directives];
      root.imports = context.imports;
      root.hoists = context.hoists;
      root.temps = context.temps;
      root.cached = context.cached;
  }
  function createRootCodegen(root, context) {
      const { helper, removeHelper } = context;
      const { children } = root;
      if (children.length === 1) {
          const child = children[0];
          // if the single child is an element, turn it into a block.
          if (isSingleElementRoot(root, child) && child.codegenNode) {
              // single element root is never hoisted so codegenNode will never be
              // SimpleExpressionNode
              const codegenNode = child.codegenNode;
              if (codegenNode.type === 13 /* VNODE_CALL */) {
                  if (!codegenNode.isBlock) {
                      removeHelper(CREATE_VNODE);
                      codegenNode.isBlock = true;
                      helper(OPEN_BLOCK);
                      helper(CREATE_BLOCK);
                  }
              }
              root.codegenNode = codegenNode;
          }
          else {
              // - single <slot/>, IfNode, ForNode: already blocks.
              // - single text node: always patched.
              // root codegen falls through via genNode()
              root.codegenNode = child;
          }
      }
      else if (children.length > 1) {
          // root has multiple nodes - return a fragment block.
          let patchFlag = 64 /* STABLE_FRAGMENT */;
          let patchFlagText = PatchFlagNames[64 /* STABLE_FRAGMENT */];
          // check if the fragment actually contains a single valid child with
          // the rest being comments
          if (children.filter(c => c.type !== 3 /* COMMENT */).length === 1) {
              patchFlag |= 2048 /* DEV_ROOT_FRAGMENT */;
              patchFlagText += `, ${PatchFlagNames[2048 /* DEV_ROOT_FRAGMENT */]}`;
          }
          root.codegenNode = createVNodeCall(context, helper(FRAGMENT), undefined, root.children, patchFlag + (` /* ${patchFlagText} */` ), undefined, undefined, true);
      }
      else ;
  }
  function traverseChildren(parent, context) {
      let i = 0;
      const nodeRemoved = () => {
          i--;
      };
      for (; i < parent.children.length; i++) {
          const child = parent.children[i];
          if (isString(child))
              continue;
          context.parent = parent;
          context.childIndex = i;
          context.onNodeRemoved = nodeRemoved;
          traverseNode(child, context);
      }
  }
  function traverseNode(node, context) {
      context.currentNode = node;
      // apply transform plugins
      const { nodeTransforms } = context;
      const exitFns = [];
      for (let i = 0; i < nodeTransforms.length; i++) {
          const onExit = nodeTransforms[i](node, context);
          if (onExit) {
              if (isArray(onExit)) {
                  exitFns.push(...onExit);
              }
              else {
                  exitFns.push(onExit);
              }
          }
          if (!context.currentNode) {
              // node was removed
              return;
          }
          else {
              // node may have been replaced
              node = context.currentNode;
          }
      }
      switch (node.type) {
          case 3 /* COMMENT */:
              if (!context.ssr) {
                  // inject import for the Comment symbol, which is needed for creating
                  // comment nodes with `createVNode`
                  context.helper(CREATE_COMMENT);
              }
              break;
          case 5 /* INTERPOLATION */:
              // no need to traverse, but we need to inject toString helper
              if (!context.ssr) {
                  context.helper(TO_DISPLAY_STRING);
              }
              break;
          // for container types, further traverse downwards
          case 9 /* IF */:
              for (let i = 0; i < node.branches.length; i++) {
                  traverseNode(node.branches[i], context);
              }
              break;
          case 10 /* IF_BRANCH */:
          case 11 /* FOR */:
          case 1 /* ELEMENT */:
          case 0 /* ROOT */:
              traverseChildren(node, context);
              break;
      }
      // exit transforms
      context.currentNode = node;
      let i = exitFns.length;
      while (i--) {
          exitFns[i]();
      }
  }
  function createStructuralDirectiveTransform(name, fn) {
      const matches = isString(name)
          ? (n) => n === name
          : (n) => name.test(n);
      return (node, context) => {
          if (node.type === 1 /* ELEMENT */) {
              const { props } = node;
              // structural directive transforms are not concerned with slots
              // as they are handled separately in vSlot.ts
              if (node.tagType === 3 /* TEMPLATE */ && props.some(isVSlot)) {
                  return;
              }
              const exitFns = [];
              for (let i = 0; i < props.length; i++) {
                  const prop = props[i];
                  if (prop.type === 7 /* DIRECTIVE */ && matches(prop.name)) {
                      // structural directives are removed to avoid infinite recursion
                      // also we remove them *before* applying so that it can further
                      // traverse itself in case it moves the node around
                      props.splice(i, 1);
                      i--;
                      const onExit = fn(node, prop, context);
                      if (onExit)
                          exitFns.push(onExit);
                  }
              }
              return exitFns;
          }
      };
  }

  const PURE_ANNOTATION = `/*#__PURE__*/`;
  function createCodegenContext(ast, { mode = 'function', prefixIdentifiers = mode === 'module', sourceMap = false, filename = `template.vue.html`, scopeId = null, optimizeImports = false, runtimeGlobalName = `Vue`, runtimeModuleName = `vue`, ssr = false }) {
      const context = {
          mode,
          prefixIdentifiers,
          sourceMap,
          filename,
          scopeId,
          optimizeImports,
          runtimeGlobalName,
          runtimeModuleName,
          ssr,
          source: ast.loc.source,
          code: ``,
          column: 1,
          line: 1,
          offset: 0,
          indentLevel: 0,
          pure: false,
          map: undefined,
          helper(key) {
              return `_${helperNameMap[key]}`;
          },
          push(code, node) {
              context.code += code;
          },
          indent() {
              newline(++context.indentLevel);
          },
          deindent(withoutNewLine = false) {
              if (withoutNewLine) {
                  --context.indentLevel;
              }
              else {
                  newline(--context.indentLevel);
              }
          },
          newline() {
              newline(context.indentLevel);
          }
      };
      function newline(n) {
          context.push('\n' + `  `.repeat(n));
      }
      return context;
  }
  function generate(ast, options = {}) {
      const context = createCodegenContext(ast, options);
      if (options.onContextCreated)
          options.onContextCreated(context);
      const { mode, push, prefixIdentifiers, indent, deindent, newline, scopeId, ssr } = context;
      const hasHelpers = ast.helpers.length > 0;
      const useWithBlock = !prefixIdentifiers && mode !== 'module';
      // preambles
      // in setup() inline mode, the preamble is generated in a sub context
      // and returned separately.
      const preambleContext = context;
      {
          genFunctionPreamble(ast, preambleContext);
      }
      // enter render function
      const functionName = ssr ? `ssrRender` : `render`;
      const args = ssr ? ['_ctx', '_push', '_parent', '_attrs'] : ['_ctx', '_cache'];
      const signature = args.join(', ');
      {
          push(`function ${functionName}(${signature}) {`);
      }
      indent();
      if (useWithBlock) {
          push(`with (_ctx) {`);
          indent();
          // function mode const declarations should be inside with block
          // also they should be renamed to avoid collision with user properties
          if (hasHelpers) {
              push(`const { ${ast.helpers
                .map(s => `${helperNameMap[s]}: _${helperNameMap[s]}`)
                .join(', ')} } = _Vue`);
              push(`\n`);
              newline();
          }
      }
      // generate asset resolution statements
      if (ast.components.length) {
          genAssets(ast.components, 'component', context);
          if (ast.directives.length || ast.temps > 0) {
              newline();
          }
      }
      if (ast.directives.length) {
          genAssets(ast.directives, 'directive', context);
          if (ast.temps > 0) {
              newline();
          }
      }
      if (ast.temps > 0) {
          push(`let `);
          for (let i = 0; i < ast.temps; i++) {
              push(`${i > 0 ? `, ` : ``}_temp${i}`);
          }
      }
      if (ast.components.length || ast.directives.length || ast.temps) {
          push(`\n`);
          newline();
      }
      // generate the VNode tree expression
      if (!ssr) {
          push(`return `);
      }
      if (ast.codegenNode) {
          genNode(ast.codegenNode, context);
      }
      else {
          push(`null`);
      }
      if (useWithBlock) {
          deindent();
          push(`}`);
      }
      deindent();
      push(`}`);
      return {
          ast,
          code: context.code,
          preamble: ``,
          // SourceMapGenerator does have toJSON() method but it's not in the types
          map: context.map ? context.map.toJSON() : undefined
      };
  }
  function genFunctionPreamble(ast, context) {
      const { ssr, prefixIdentifiers, push, newline, runtimeModuleName, runtimeGlobalName } = context;
      const VueBinding = runtimeGlobalName;
      const aliasHelper = (s) => `${helperNameMap[s]}: _${helperNameMap[s]}`;
      // Generate const declaration for helpers
      // In prefix mode, we place the const declaration at top so it's done
      // only once; But if we not prefixing, we place the declaration inside the
      // with block so it doesn't incur the `in` check cost for every helper access.
      if (ast.helpers.length > 0) {
          {
              // "with" mode.
              // save Vue in a separate variable to avoid collision
              push(`const _Vue = ${VueBinding}\n`);
              // in "with" mode, helpers are declared inside the with block to avoid
              // has check cost, but hoists are lifted out of the function - we need
              // to provide the helper here.
              if (ast.hoists.length) {
                  const staticHelpers = [
                      CREATE_VNODE,
                      CREATE_COMMENT,
                      CREATE_TEXT,
                      CREATE_STATIC
                  ]
                      .filter(helper => ast.helpers.includes(helper))
                      .map(aliasHelper)
                      .join(', ');
                  push(`const { ${staticHelpers} } = _Vue\n`);
              }
          }
      }
      genHoists(ast.hoists, context);
      newline();
      push(`return `);
  }
  function genAssets(assets, type, { helper, push, newline }) {
      const resolver = helper(type === 'component' ? RESOLVE_COMPONENT : RESOLVE_DIRECTIVE);
      for (let i = 0; i < assets.length; i++) {
          let id = assets[i];
          // potential component implicit self-reference inferred from SFC filename
          const maybeSelfReference = id.endsWith('__self');
          if (maybeSelfReference) {
              id = id.slice(0, -6);
          }
          push(`const ${toValidAssetId(id, type)} = ${resolver}(${JSON.stringify(id)}${maybeSelfReference ? `, true` : ``})`);
          if (i < assets.length - 1) {
              newline();
          }
      }
  }
  function genHoists(hoists, context) {
      if (!hoists.length) {
          return;
      }
      context.pure = true;
      const { push, newline, helper, scopeId, mode } = context;
      newline();
      hoists.forEach((exp, i) => {
          if (exp) {
              push(`const _hoisted_${i + 1} = `);
              genNode(exp, context);
              newline();
          }
      });
      context.pure = false;
  }
  function isText$1(n) {
      return (isString(n) ||
          n.type === 4 /* SIMPLE_EXPRESSION */ ||
          n.type === 2 /* TEXT */ ||
          n.type === 5 /* INTERPOLATION */ ||
          n.type === 8 /* COMPOUND_EXPRESSION */);
  }
  function genNodeListAsArray(nodes, context) {
      const multilines = nodes.length > 3 ||
          (nodes.some(n => isArray(n) || !isText$1(n)));
      context.push(`[`);
      multilines && context.indent();
      genNodeList(nodes, context, multilines);
      multilines && context.deindent();
      context.push(`]`);
  }
  function genNodeList(nodes, context, multilines = false, comma = true) {
      const { push, newline } = context;
      for (let i = 0; i < nodes.length; i++) {
          const node = nodes[i];
          if (isString(node)) {
              push(node);
          }
          else if (isArray(node)) {
              genNodeListAsArray(node, context);
          }
          else {
              genNode(node, context);
          }
          if (i < nodes.length - 1) {
              if (multilines) {
                  comma && push(',');
                  newline();
              }
              else {
                  comma && push(', ');
              }
          }
      }
  }
  function genNode(node, context) {
      if (isString(node)) {
          context.push(node);
          return;
      }
      if (isSymbol(node)) {
          context.push(context.helper(node));
          return;
      }
      switch (node.type) {
          case 1 /* ELEMENT */:
          case 9 /* IF */:
          case 11 /* FOR */:
              assert(node.codegenNode != null, `Codegen node is missing for element/if/for node. ` +
                      `Apply appropriate transforms first.`);
              genNode(node.codegenNode, context);
              break;
          case 2 /* TEXT */:
              genText(node, context);
              break;
          case 4 /* SIMPLE_EXPRESSION */:
              genExpression(node, context);
              break;
          case 5 /* INTERPOLATION */:
              genInterpolation(node, context);
              break;
          case 12 /* TEXT_CALL */:
              genNode(node.codegenNode, context);
              break;
          case 8 /* COMPOUND_EXPRESSION */:
              genCompoundExpression(node, context);
              break;
          case 3 /* COMMENT */:
              genComment(node, context);
              break;
          case 13 /* VNODE_CALL */:
              genVNodeCall(node, context);
              break;
          case 14 /* JS_CALL_EXPRESSION */:
              genCallExpression(node, context);
              break;
          case 15 /* JS_OBJECT_EXPRESSION */:
              genObjectExpression(node, context);
              break;
          case 17 /* JS_ARRAY_EXPRESSION */:
              genArrayExpression(node, context);
              break;
          case 18 /* JS_FUNCTION_EXPRESSION */:
              genFunctionExpression(node, context);
              break;
          case 19 /* JS_CONDITIONAL_EXPRESSION */:
              genConditionalExpression(node, context);
              break;
          case 20 /* JS_CACHE_EXPRESSION */:
              genCacheExpression(node, context);
              break;
          // SSR only types
          case 21 /* JS_BLOCK_STATEMENT */:
              break;
          case 22 /* JS_TEMPLATE_LITERAL */:
              break;
          case 23 /* JS_IF_STATEMENT */:
              break;
          case 24 /* JS_ASSIGNMENT_EXPRESSION */:
              break;
          case 25 /* JS_SEQUENCE_EXPRESSION */:
              break;
          case 26 /* JS_RETURN_STATEMENT */:
              break;
          /* istanbul ignore next */
          case 10 /* IF_BRANCH */:
              // noop
              break;
          default:
              {
                  assert(false, `unhandled codegen node type: ${node.type}`);
                  // make sure we exhaust all possible types
                  const exhaustiveCheck = node;
                  return exhaustiveCheck;
              }
      }
  }
  function genText(node, context) {
      context.push(JSON.stringify(node.content), node);
  }
  function genExpression(node, context) {
      const { content, isStatic } = node;
      context.push(isStatic ? JSON.stringify(content) : content, node);
  }
  function genInterpolation(node, context) {
      const { push, helper, pure } = context;
      if (pure)
          push(PURE_ANNOTATION);
      push(`${helper(TO_DISPLAY_STRING)}(`);
      genNode(node.content, context);
      push(`)`);
  }
  function genCompoundExpression(node, context) {
      for (let i = 0; i < node.children.length; i++) {
          const child = node.children[i];
          if (isString(child)) {
              context.push(child);
          }
          else {
              genNode(child, context);
          }
      }
  }
  function genExpressionAsPropertyKey(node, context) {
      const { push } = context;
      if (node.type === 8 /* COMPOUND_EXPRESSION */) {
          push(`[`);
          genCompoundExpression(node, context);
          push(`]`);
      }
      else if (node.isStatic) {
          // only quote keys if necessary
          const text = isSimpleIdentifier(node.content)
              ? node.content
              : JSON.stringify(node.content);
          push(text, node);
      }
      else {
          push(`[${node.content}]`, node);
      }
  }
  function genComment(node, context) {
      {
          const { push, helper, pure } = context;
          if (pure) {
              push(PURE_ANNOTATION);
          }
          push(`${helper(CREATE_COMMENT)}(${JSON.stringify(node.content)})`, node);
      }
  }
  function genVNodeCall(node, context) {
      const { push, helper, pure } = context;
      const { tag, props, children, patchFlag, dynamicProps, directives, isBlock, disableTracking } = node;
      if (directives) {
          push(helper(WITH_DIRECTIVES) + `(`);
      }
      if (isBlock) {
          push(`(${helper(OPEN_BLOCK)}(${disableTracking ? `true` : ``}), `);
      }
      if (pure) {
          push(PURE_ANNOTATION);
      }
      push(helper(isBlock ? CREATE_BLOCK : CREATE_VNODE) + `(`, node);
      genNodeList(genNullableArgs([tag, props, children, patchFlag, dynamicProps]), context);
      push(`)`);
      if (isBlock) {
          push(`)`);
      }
      if (directives) {
          push(`, `);
          genNode(directives, context);
          push(`)`);
      }
  }
  function genNullableArgs(args) {
      let i = args.length;
      while (i--) {
          if (args[i] != null)
              break;
      }
      return args.slice(0, i + 1).map(arg => arg || `null`);
  }
  // JavaScript
  function genCallExpression(node, context) {
      const { push, helper, pure } = context;
      const callee = isString(node.callee) ? node.callee : helper(node.callee);
      if (pure) {
          push(PURE_ANNOTATION);
      }
      push(callee + `(`, node);
      genNodeList(node.arguments, context);
      push(`)`);
  }
  function genObjectExpression(node, context) {
      const { push, indent, deindent, newline } = context;
      const { properties } = node;
      if (!properties.length) {
          push(`{}`, node);
          return;
      }
      const multilines = properties.length > 1 ||
          (properties.some(p => p.value.type !== 4 /* SIMPLE_EXPRESSION */));
      push(multilines ? `{` : `{ `);
      multilines && indent();
      for (let i = 0; i < properties.length; i++) {
          const { key, value } = properties[i];
          // key
          genExpressionAsPropertyKey(key, context);
          push(`: `);
          // value
          genNode(value, context);
          if (i < properties.length - 1) {
              // will only reach this if it's multilines
              push(`,`);
              newline();
          }
      }
      multilines && deindent();
      push(multilines ? `}` : ` }`);
  }
  function genArrayExpression(node, context) {
      genNodeListAsArray(node.elements, context);
  }
  function genFunctionExpression(node, context) {
      const { push, indent, deindent, scopeId, mode } = context;
      const { params, returns, body, newline, isSlot } = node;
      if (isSlot) {
          // wrap slot functions with owner context
          push(`_${helperNameMap[WITH_CTX]}(`);
      }
      push(`(`, node);
      if (isArray(params)) {
          genNodeList(params, context);
      }
      else if (params) {
          genNode(params, context);
      }
      push(`) => `);
      if (newline || body) {
          push(`{`);
          indent();
      }
      if (returns) {
          if (newline) {
              push(`return `);
          }
          if (isArray(returns)) {
              genNodeListAsArray(returns, context);
          }
          else {
              genNode(returns, context);
          }
      }
      else if (body) {
          genNode(body, context);
      }
      if (newline || body) {
          deindent();
          push(`}`);
      }
      if (isSlot) {
          push(`)`);
      }
  }
  function genConditionalExpression(node, context) {
      const { test, consequent, alternate, newline: needNewline } = node;
      const { push, indent, deindent, newline } = context;
      if (test.type === 4 /* SIMPLE_EXPRESSION */) {
          const needsParens = !isSimpleIdentifier(test.content);
          needsParens && push(`(`);
          genExpression(test, context);
          needsParens && push(`)`);
      }
      else {
          push(`(`);
          genNode(test, context);
          push(`)`);
      }
      needNewline && indent();
      context.indentLevel++;
      needNewline || push(` `);
      push(`? `);
      genNode(consequent, context);
      context.indentLevel--;
      needNewline && newline();
      needNewline || push(` `);
      push(`: `);
      const isNested = alternate.type === 19 /* JS_CONDITIONAL_EXPRESSION */;
      if (!isNested) {
          context.indentLevel++;
      }
      genNode(alternate, context);
      if (!isNested) {
          context.indentLevel--;
      }
      needNewline && deindent(true /* without newline */);
  }
  function genCacheExpression(node, context) {
      const { push, helper, indent, deindent, newline } = context;
      push(`_cache[${node.index}] || (`);
      if (node.isVNode) {
          indent();
          push(`${helper(SET_BLOCK_TRACKING)}(-1),`);
          newline();
      }
      push(`_cache[${node.index}] = `);
      genNode(node.value, context);
      if (node.isVNode) {
          push(`,`);
          newline();
          push(`${helper(SET_BLOCK_TRACKING)}(1),`);
          newline();
          push(`_cache[${node.index}]`);
          deindent();
      }
      push(`)`);
  }

  // these keywords should not appear inside expressions, but operators like
  // typeof, instanceof and in are allowed
  const prohibitedKeywordRE = new RegExp('\\b' +
      ('do,if,for,let,new,try,var,case,else,with,await,break,catch,class,const,' +
          'super,throw,while,yield,delete,export,import,return,switch,default,' +
          'extends,finally,continue,debugger,function,arguments,typeof,void')
          .split(',')
          .join('\\b|\\b') +
      '\\b');
  // strip strings in expressions
  const stripStringRE = /'(?:[^'\\]|\\.)*'|"(?:[^"\\]|\\.)*"|`(?:[^`\\]|\\.)*\$\{|\}(?:[^`\\]|\\.)*`|`(?:[^`\\]|\\.)*`/g;
  /**
   * Validate a non-prefixed expression.
   * This is only called when using the in-browser runtime compiler since it
   * doesn't prefix expressions.
   */
  function validateBrowserExpression(node, context, asParams = false, asRawStatements = false) {
      const exp = node.content;
      // empty expressions are validated per-directive since some directives
      // do allow empty expressions.
      if (!exp.trim()) {
          return;
      }
      try {
          new Function(asRawStatements
              ? ` ${exp} `
              : `return ${asParams ? `(${exp}) => {}` : `(${exp})`}`);
      }
      catch (e) {
          let message = e.message;
          const keywordMatch = exp
              .replace(stripStringRE, '')
              .match(prohibitedKeywordRE);
          if (keywordMatch) {
              message = `avoid using JavaScript keyword as property name: "${keywordMatch[0]}"`;
          }
          context.onError(createCompilerError(43 /* X_INVALID_EXPRESSION */, node.loc, undefined, message));
      }
  }

  const transformExpression = (node, context) => {
      if (node.type === 5 /* INTERPOLATION */) {
          node.content = processExpression(node.content, context);
      }
      else if (node.type === 1 /* ELEMENT */) {
          // handle directives on element
          for (let i = 0; i < node.props.length; i++) {
              const dir = node.props[i];
              // do not process for v-on & v-for since they are special handled
              if (dir.type === 7 /* DIRECTIVE */ && dir.name !== 'for') {
                  const exp = dir.exp;
                  const arg = dir.arg;
                  // do not process exp if this is v-on:arg - we need special handling
                  // for wrapping inline statements.
                  if (exp &&
                      exp.type === 4 /* SIMPLE_EXPRESSION */ &&
                      !(dir.name === 'on' && arg)) {
                      dir.exp = processExpression(exp, context, 
                      // slot args must be processed as function params
                      dir.name === 'slot');
                  }
                  if (arg && arg.type === 4 /* SIMPLE_EXPRESSION */ && !arg.isStatic) {
                      dir.arg = processExpression(arg, context);
                  }
              }
          }
      }
  };
  // Important: since this function uses Node.js only dependencies, it should
  // always be used with a leading !true check so that it can be
  // tree-shaken from the browser build.
  function processExpression(node, context, 
  // some expressions like v-slot props & v-for aliases should be parsed as
  // function params
  asParams = false, 
  // v-on handler values may contain multiple statements
  asRawStatements = false) {
      {
          {
              // simple in-browser validation (same logic in 2.x)
              validateBrowserExpression(node, context, asParams, asRawStatements);
          }
          return node;
      }
  }

  const transformIf = createStructuralDirectiveTransform(/^(if|else|else-if)$/, (node, dir, context) => {
      return processIf(node, dir, context, (ifNode, branch, isRoot) => {
          // #1587: We need to dynamically increment the key based on the current
          // node's sibling nodes, since chained v-if/else branches are
          // rendered at the same depth
          const siblings = context.parent.children;
          let i = siblings.indexOf(ifNode);
          let key = 0;
          while (i-- >= 0) {
              const sibling = siblings[i];
              if (sibling && sibling.type === 9 /* IF */) {
                  key += sibling.branches.length;
              }
          }
          // Exit callback. Complete the codegenNode when all children have been
          // transformed.
          return () => {
              if (isRoot) {
                  ifNode.codegenNode = createCodegenNodeForBranch(branch, key, context);
              }
              else {
                  // attach this branch's codegen node to the v-if root.
                  const parentCondition = getParentCondition(ifNode.codegenNode);
                  parentCondition.alternate = createCodegenNodeForBranch(branch, key + ifNode.branches.length - 1, context);
              }
          };
      });
  });
  // target-agnostic transform used for both Client and SSR
  function processIf(node, dir, context, processCodegen) {
      if (dir.name !== 'else' &&
          (!dir.exp || !dir.exp.content.trim())) {
          const loc = dir.exp ? dir.exp.loc : node.loc;
          context.onError(createCompilerError(27 /* X_V_IF_NO_EXPRESSION */, dir.loc));
          dir.exp = createSimpleExpression(`true`, false, loc);
      }
      if (dir.exp) {
          validateBrowserExpression(dir.exp, context);
      }
      if (dir.name === 'if') {
          const branch = createIfBranch(node, dir);
          const ifNode = {
              type: 9 /* IF */,
              loc: node.loc,
              branches: [branch]
          };
          context.replaceNode(ifNode);
          if (processCodegen) {
              return processCodegen(ifNode, branch, true);
          }
      }
      else {
          // locate the adjacent v-if
          const siblings = context.parent.children;
          const comments = [];
          let i = siblings.indexOf(node);
          while (i-- >= -1) {
              const sibling = siblings[i];
              if (sibling && sibling.type === 3 /* COMMENT */) {
                  context.removeNode(sibling);
                  comments.unshift(sibling);
                  continue;
              }
              if (sibling &&
                  sibling.type === 2 /* TEXT */ &&
                  !sibling.content.trim().length) {
                  context.removeNode(sibling);
                  continue;
              }
              if (sibling && sibling.type === 9 /* IF */) {
                  // move the node to the if node's branches
                  context.removeNode();
                  const branch = createIfBranch(node, dir);
                  if (comments.length) {
                      branch.children = [...comments, ...branch.children];
                  }
                  // check if user is forcing same key on different branches
                  {
                      const key = branch.userKey;
                      if (key) {
                          sibling.branches.forEach(({ userKey }) => {
                              if (isSameKey(userKey, key)) {
                                  context.onError(createCompilerError(28 /* X_V_IF_SAME_KEY */, branch.userKey.loc));
                              }
                          });
                      }
                  }
                  sibling.branches.push(branch);
                  const onExit = processCodegen && processCodegen(sibling, branch, false);
                  // since the branch was removed, it will not be traversed.
                  // make sure to traverse here.
                  traverseNode(branch, context);
                  // call on exit
                  if (onExit)
                      onExit();
                  // make sure to reset currentNode after traversal to indicate this
                  // node has been removed.
                  context.currentNode = null;
              }
              else {
                  context.onError(createCompilerError(29 /* X_V_ELSE_NO_ADJACENT_IF */, node.loc));
              }
              break;
          }
      }
  }
  function createIfBranch(node, dir) {
      return {
          type: 10 /* IF_BRANCH */,
          loc: node.loc,
          condition: dir.name === 'else' ? undefined : dir.exp,
          children: node.tagType === 3 /* TEMPLATE */ && !findDir(node, 'for')
              ? node.children
              : [node],
          userKey: findProp(node, `key`)
      };
  }
  function createCodegenNodeForBranch(branch, keyIndex, context) {
      if (branch.condition) {
          return createConditionalExpression(branch.condition, createChildrenCodegenNode(branch, keyIndex, context), 
          // make sure to pass in asBlock: true so that the comment node call
          // closes the current block.
          createCallExpression(context.helper(CREATE_COMMENT), [
              '"v-if"' ,
              'true'
          ]));
      }
      else {
          return createChildrenCodegenNode(branch, keyIndex, context);
      }
  }
  function createChildrenCodegenNode(branch, keyIndex, context) {
      const { helper, removeHelper } = context;
      const keyProperty = createObjectProperty(`key`, createSimpleExpression(`${keyIndex}`, false, locStub, 2 /* CAN_HOIST */));
      const { children } = branch;
      const firstChild = children[0];
      const needFragmentWrapper = children.length !== 1 || firstChild.type !== 1 /* ELEMENT */;
      if (needFragmentWrapper) {
          if (children.length === 1 && firstChild.type === 11 /* FOR */) {
              // optimize away nested fragments when child is a ForNode
              const vnodeCall = firstChild.codegenNode;
              injectProp(vnodeCall, keyProperty, context);
              return vnodeCall;
          }
          else {
              let patchFlag = 64 /* STABLE_FRAGMENT */;
              let patchFlagText = PatchFlagNames[64 /* STABLE_FRAGMENT */];
              // check if the fragment actually contains a single valid child with
              // the rest being comments
              if (children.filter(c => c.type !== 3 /* COMMENT */).length === 1) {
                  patchFlag |= 2048 /* DEV_ROOT_FRAGMENT */;
                  patchFlagText += `, ${PatchFlagNames[2048 /* DEV_ROOT_FRAGMENT */]}`;
              }
              return createVNodeCall(context, helper(FRAGMENT), createObjectExpression([keyProperty]), children, patchFlag + (` /* ${patchFlagText} */` ), undefined, undefined, true, false, branch.loc);
          }
      }
      else {
          const vnodeCall = firstChild
              .codegenNode;
          // Change createVNode to createBlock.
          if (vnodeCall.type === 13 /* VNODE_CALL */ && !vnodeCall.isBlock) {
              removeHelper(CREATE_VNODE);
              vnodeCall.isBlock = true;
              helper(OPEN_BLOCK);
              helper(CREATE_BLOCK);
          }
          // inject branch key
          injectProp(vnodeCall, keyProperty, context);
          return vnodeCall;
      }
  }
  function isSameKey(a, b) {
      if (!a || a.type !== b.type) {
          return false;
      }
      if (a.type === 6 /* ATTRIBUTE */) {
          if (a.value.content !== b.value.content) {
              return false;
          }
      }
      else {
          // directive
          const exp = a.exp;
          const branchExp = b.exp;
          if (exp.type !== branchExp.type) {
              return false;
          }
          if (exp.type !== 4 /* SIMPLE_EXPRESSION */ ||
              (exp.isStatic !== branchExp.isStatic ||
                  exp.content !== branchExp.content)) {
              return false;
          }
      }
      return true;
  }
  function getParentCondition(node) {
      while (true) {
          if (node.type === 19 /* JS_CONDITIONAL_EXPRESSION */) {
              if (node.alternate.type === 19 /* JS_CONDITIONAL_EXPRESSION */) {
                  node = node.alternate;
              }
              else {
                  return node;
              }
          }
          else if (node.type === 20 /* JS_CACHE_EXPRESSION */) {
              node = node.value;
          }
      }
  }

  const transformFor = createStructuralDirectiveTransform('for', (node, dir, context) => {
      const { helper, removeHelper } = context;
      return processFor(node, dir, context, forNode => {
          // create the loop render function expression now, and add the
          // iterator on exit after all children have been traversed
          const renderExp = createCallExpression(helper(RENDER_LIST), [
              forNode.source
          ]);
          const keyProp = findProp(node, `key`);
          const keyProperty = keyProp
              ? createObjectProperty(`key`, keyProp.type === 6 /* ATTRIBUTE */
                  ? createSimpleExpression(keyProp.value.content, true)
                  : keyProp.exp)
              : null;
          const isStableFragment = forNode.source.type === 4 /* SIMPLE_EXPRESSION */ &&
              forNode.source.constType > 0 /* NOT_CONSTANT */;
          const fragmentFlag = isStableFragment
              ? 64 /* STABLE_FRAGMENT */
              : keyProp
                  ? 128 /* KEYED_FRAGMENT */
                  : 256 /* UNKEYED_FRAGMENT */;
          forNode.codegenNode = createVNodeCall(context, helper(FRAGMENT), undefined, renderExp, fragmentFlag +
              (` /* ${PatchFlagNames[fragmentFlag]} */` ), undefined, undefined, true /* isBlock */, !isStableFragment /* disableTracking */, node.loc);
          return () => {
              // finish the codegen now that all children have been traversed
              let childBlock;
              const isTemplate = isTemplateNode(node);
              const { children } = forNode;
              // check <template v-for> key placement
              if (isTemplate) {
                  node.children.some(c => {
                      if (c.type === 1 /* ELEMENT */) {
                          const key = findProp(c, 'key');
                          if (key) {
                              context.onError(createCompilerError(32 /* X_V_FOR_TEMPLATE_KEY_PLACEMENT */, key.loc));
                              return true;
                          }
                      }
                  });
              }
              const needFragmentWrapper = children.length !== 1 || children[0].type !== 1 /* ELEMENT */;
              const slotOutlet = isSlotOutlet(node)
                  ? node
                  : isTemplate &&
                      node.children.length === 1 &&
                      isSlotOutlet(node.children[0])
                      ? node.children[0] // api-extractor somehow fails to infer this
                      : null;
              if (slotOutlet) {
                  // <slot v-for="..."> or <template v-for="..."><slot/></template>
                  childBlock = slotOutlet.codegenNode;
                  if (isTemplate && keyProperty) {
                      // <template v-for="..." :key="..."><slot/></template>
                      // we need to inject the key to the renderSlot() call.
                      // the props for renderSlot is passed as the 3rd argument.
                      injectProp(childBlock, keyProperty, context);
                  }
              }
              else if (needFragmentWrapper) {
                  // <template v-for="..."> with text or multi-elements
                  // should generate a fragment block for each loop
                  childBlock = createVNodeCall(context, helper(FRAGMENT), keyProperty ? createObjectExpression([keyProperty]) : undefined, node.children, 64 /* STABLE_FRAGMENT */ +
                      (` /* ${PatchFlagNames[64 /* STABLE_FRAGMENT */]} */`
                          ), undefined, undefined, true);
              }
              else {
                  // Normal element v-for. Directly use the child's codegenNode
                  // but mark it as a block.
                  childBlock = children[0]
                      .codegenNode;
                  if (isTemplate && keyProperty) {
                      injectProp(childBlock, keyProperty, context);
                  }
                  if (childBlock.isBlock !== !isStableFragment) {
                      if (childBlock.isBlock) {
                          // switch from block to vnode
                          removeHelper(OPEN_BLOCK);
                          removeHelper(CREATE_BLOCK);
                      }
                      else {
                          // switch from vnode to block
                          removeHelper(CREATE_VNODE);
                      }
                  }
                  childBlock.isBlock = !isStableFragment;
                  if (childBlock.isBlock) {
                      helper(OPEN_BLOCK);
                      helper(CREATE_BLOCK);
                  }
                  else {
                      helper(CREATE_VNODE);
                  }
              }
              renderExp.arguments.push(createFunctionExpression(createForLoopParams(forNode.parseResult), childBlock, true /* force newline */));
          };
      });
  });
  // target-agnostic transform used for both Client and SSR
  function processFor(node, dir, context, processCodegen) {
      if (!dir.exp) {
          context.onError(createCompilerError(30 /* X_V_FOR_NO_EXPRESSION */, dir.loc));
          return;
      }
      const parseResult = parseForExpression(
      // can only be simple expression because vFor transform is applied
      // before expression transform.
      dir.exp, context);
      if (!parseResult) {
          context.onError(createCompilerError(31 /* X_V_FOR_MALFORMED_EXPRESSION */, dir.loc));
          return;
      }
      const { addIdentifiers, removeIdentifiers, scopes } = context;
      const { source, value, key, index } = parseResult;
      const forNode = {
          type: 11 /* FOR */,
          loc: dir.loc,
          source,
          valueAlias: value,
          keyAlias: key,
          objectIndexAlias: index,
          parseResult,
          children: isTemplateNode(node) ? node.children : [node]
      };
      context.replaceNode(forNode);
      // bookkeeping
      scopes.vFor++;
      const onExit = processCodegen && processCodegen(forNode);
      return () => {
          scopes.vFor--;
          if (onExit)
              onExit();
      };
  }
  const forAliasRE = /([\s\S]*?)\s+(?:in|of)\s+([\s\S]*)/;
  // This regex doesn't cover the case if key or index aliases have destructuring,
  // but those do not make sense in the first place, so this works in practice.
  const forIteratorRE = /,([^,\}\]]*)(?:,([^,\}\]]*))?$/;
  const stripParensRE = /^\(|\)$/g;
  function parseForExpression(input, context) {
      const loc = input.loc;
      const exp = input.content;
      const inMatch = exp.match(forAliasRE);
      if (!inMatch)
          return;
      const [, LHS, RHS] = inMatch;
      const result = {
          source: createAliasExpression(loc, RHS.trim(), exp.indexOf(RHS, LHS.length)),
          value: undefined,
          key: undefined,
          index: undefined
      };
      {
          validateBrowserExpression(result.source, context);
      }
      let valueContent = LHS.trim()
          .replace(stripParensRE, '')
          .trim();
      const trimmedOffset = LHS.indexOf(valueContent);
      const iteratorMatch = valueContent.match(forIteratorRE);
      if (iteratorMatch) {
          valueContent = valueContent.replace(forIteratorRE, '').trim();
          const keyContent = iteratorMatch[1].trim();
          let keyOffset;
          if (keyContent) {
              keyOffset = exp.indexOf(keyContent, trimmedOffset + valueContent.length);
              result.key = createAliasExpression(loc, keyContent, keyOffset);
              {
                  validateBrowserExpression(result.key, context, true);
              }
          }
          if (iteratorMatch[2]) {
              const indexContent = iteratorMatch[2].trim();
              if (indexContent) {
                  result.index = createAliasExpression(loc, indexContent, exp.indexOf(indexContent, result.key
                      ? keyOffset + keyContent.length
                      : trimmedOffset + valueContent.length));
                  {
                      validateBrowserExpression(result.index, context, true);
                  }
              }
          }
      }
      if (valueContent) {
          result.value = createAliasExpression(loc, valueContent, trimmedOffset);
          {
              validateBrowserExpression(result.value, context, true);
          }
      }
      return result;
  }
  function createAliasExpression(range, content, offset) {
      return createSimpleExpression(content, false, getInnerRange(range, offset, content.length));
  }
  function createForLoopParams({ value, key, index }) {
      const params = [];
      if (value) {
          params.push(value);
      }
      if (key) {
          if (!value) {
              params.push(createSimpleExpression(`_`, false));
          }
          params.push(key);
      }
      if (index) {
          if (!key) {
              if (!value) {
                  params.push(createSimpleExpression(`_`, false));
              }
              params.push(createSimpleExpression(`__`, false));
          }
          params.push(index);
      }
      return params;
  }

  const defaultFallback = createSimpleExpression(`undefined`, false);
  // A NodeTransform that:
  // 1. Tracks scope identifiers for scoped slots so that they don't get prefixed
  //    by transformExpression. This is only applied in non-browser builds with
  //    { prefixIdentifiers: true }.
  // 2. Track v-slot depths so that we know a slot is inside another slot.
  //    Note the exit callback is executed before buildSlots() on the same node,
  //    so only nested slots see positive numbers.
  const trackSlotScopes = (node, context) => {
      if (node.type === 1 /* ELEMENT */ &&
          (node.tagType === 1 /* COMPONENT */ ||
              node.tagType === 3 /* TEMPLATE */)) {
          // We are only checking non-empty v-slot here
          // since we only care about slots that introduce scope variables.
          const vSlot = findDir(node, 'slot');
          if (vSlot) {
              vSlot.exp;
              context.scopes.vSlot++;
              return () => {
                  context.scopes.vSlot--;
              };
          }
      }
  };
  const buildClientSlotFn = (props, children, loc) => createFunctionExpression(props, children, false /* newline */, true /* isSlot */, children.length ? children[0].loc : loc);
  // Instead of being a DirectiveTransform, v-slot processing is called during
  // transformElement to build the slots object for a component.
  function buildSlots(node, context, buildSlotFn = buildClientSlotFn) {
      context.helper(WITH_CTX);
      const { children, loc } = node;
      const slotsProperties = [];
      const dynamicSlots = [];
      const buildDefaultSlotProperty = (props, children) => createObjectProperty(`default`, buildSlotFn(props, children, loc));
      // If the slot is inside a v-for or another v-slot, force it to be dynamic
      // since it likely uses a scope variable.
      let hasDynamicSlots = context.scopes.vSlot > 0 || context.scopes.vFor > 0;
      // 1. Check for slot with slotProps on component itself.
      //    <Comp v-slot="{ prop }"/>
      const onComponentSlot = findDir(node, 'slot', true);
      if (onComponentSlot) {
          const { arg, exp } = onComponentSlot;
          if (arg && !isStaticExp(arg)) {
              hasDynamicSlots = true;
          }
          slotsProperties.push(createObjectProperty(arg || createSimpleExpression('default', true), buildSlotFn(exp, children, loc)));
      }
      // 2. Iterate through children and check for template slots
      //    <template v-slot:foo="{ prop }">
      let hasTemplateSlots = false;
      let hasNamedDefaultSlot = false;
      const implicitDefaultChildren = [];
      const seenSlotNames = new Set();
      for (let i = 0; i < children.length; i++) {
          const slotElement = children[i];
          let slotDir;
          if (!isTemplateNode(slotElement) ||
              !(slotDir = findDir(slotElement, 'slot', true))) {
              // not a <template v-slot>, skip.
              if (slotElement.type !== 3 /* COMMENT */) {
                  implicitDefaultChildren.push(slotElement);
              }
              continue;
          }
          if (onComponentSlot) {
              // already has on-component slot - this is incorrect usage.
              context.onError(createCompilerError(36 /* X_V_SLOT_MIXED_SLOT_USAGE */, slotDir.loc));
              break;
          }
          hasTemplateSlots = true;
          const { children: slotChildren, loc: slotLoc } = slotElement;
          const { arg: slotName = createSimpleExpression(`default`, true), exp: slotProps, loc: dirLoc } = slotDir;
          // check if name is dynamic.
          let staticSlotName;
          if (isStaticExp(slotName)) {
              staticSlotName = slotName ? slotName.content : `default`;
          }
          else {
              hasDynamicSlots = true;
          }
          const slotFunction = buildSlotFn(slotProps, slotChildren, slotLoc);
          // check if this slot is conditional (v-if/v-for)
          let vIf;
          let vElse;
          let vFor;
          if ((vIf = findDir(slotElement, 'if'))) {
              hasDynamicSlots = true;
              dynamicSlots.push(createConditionalExpression(vIf.exp, buildDynamicSlot(slotName, slotFunction), defaultFallback));
          }
          else if ((vElse = findDir(slotElement, /^else(-if)?$/, true /* allowEmpty */))) {
              // find adjacent v-if
              let j = i;
              let prev;
              while (j--) {
                  prev = children[j];
                  if (prev.type !== 3 /* COMMENT */) {
                      break;
                  }
              }
              if (prev && isTemplateNode(prev) && findDir(prev, 'if')) {
                  // remove node
                  children.splice(i, 1);
                  i--;
                  // attach this slot to previous conditional
                  let conditional = dynamicSlots[dynamicSlots.length - 1];
                  while (conditional.alternate.type === 19 /* JS_CONDITIONAL_EXPRESSION */) {
                      conditional = conditional.alternate;
                  }
                  conditional.alternate = vElse.exp
                      ? createConditionalExpression(vElse.exp, buildDynamicSlot(slotName, slotFunction), defaultFallback)
                      : buildDynamicSlot(slotName, slotFunction);
              }
              else {
                  context.onError(createCompilerError(29 /* X_V_ELSE_NO_ADJACENT_IF */, vElse.loc));
              }
          }
          else if ((vFor = findDir(slotElement, 'for'))) {
              hasDynamicSlots = true;
              const parseResult = vFor.parseResult ||
                  parseForExpression(vFor.exp, context);
              if (parseResult) {
                  // Render the dynamic slots as an array and add it to the createSlot()
                  // args. The runtime knows how to handle it appropriately.
                  dynamicSlots.push(createCallExpression(context.helper(RENDER_LIST), [
                      parseResult.source,
                      createFunctionExpression(createForLoopParams(parseResult), buildDynamicSlot(slotName, slotFunction), true /* force newline */)
                  ]));
              }
              else {
                  context.onError(createCompilerError(31 /* X_V_FOR_MALFORMED_EXPRESSION */, vFor.loc));
              }
          }
          else {
              // check duplicate static names
              if (staticSlotName) {
                  if (seenSlotNames.has(staticSlotName)) {
                      context.onError(createCompilerError(37 /* X_V_SLOT_DUPLICATE_SLOT_NAMES */, dirLoc));
                      continue;
                  }
                  seenSlotNames.add(staticSlotName);
                  if (staticSlotName === 'default') {
                      hasNamedDefaultSlot = true;
                  }
              }
              slotsProperties.push(createObjectProperty(slotName, slotFunction));
          }
      }
      if (!onComponentSlot) {
          if (!hasTemplateSlots) {
              // implicit default slot (on component)
              slotsProperties.push(buildDefaultSlotProperty(undefined, children));
          }
          else if (implicitDefaultChildren.length) {
              // implicit default slot (mixed with named slots)
              if (hasNamedDefaultSlot) {
                  context.onError(createCompilerError(38 /* X_V_SLOT_EXTRANEOUS_DEFAULT_SLOT_CHILDREN */, implicitDefaultChildren[0].loc));
              }
              else {
                  slotsProperties.push(buildDefaultSlotProperty(undefined, implicitDefaultChildren));
              }
          }
      }
      const slotFlag = hasDynamicSlots
          ? 2 /* DYNAMIC */
          : hasForwardedSlots(node.children)
              ? 3 /* FORWARDED */
              : 1 /* STABLE */;
      let slots = createObjectExpression(slotsProperties.concat(createObjectProperty(`_`, 
      // 2 = compiled but dynamic = can skip normalization, but must run diff
      // 1 = compiled and static = can skip normalization AND diff as optimized
      createSimpleExpression(slotFlag + (` /* ${slotFlagsText[slotFlag]} */` ), false))), loc);
      if (dynamicSlots.length) {
          slots = createCallExpression(context.helper(CREATE_SLOTS), [
              slots,
              createArrayExpression(dynamicSlots)
          ]);
      }
      return {
          slots,
          hasDynamicSlots
      };
  }
  function buildDynamicSlot(name, fn) {
      return createObjectExpression([
          createObjectProperty(`name`, name),
          createObjectProperty(`fn`, fn)
      ]);
  }
  function hasForwardedSlots(children) {
      for (let i = 0; i < children.length; i++) {
          const child = children[i];
          switch (child.type) {
              case 1 /* ELEMENT */:
                  if (child.tagType === 2 /* SLOT */ ||
                      (child.tagType === 0 /* ELEMENT */ &&
                          hasForwardedSlots(child.children))) {
                      return true;
                  }
                  break;
              case 9 /* IF */:
                  if (hasForwardedSlots(child.branches))
                      return true;
                  break;
              case 10 /* IF_BRANCH */:
              case 11 /* FOR */:
                  if (hasForwardedSlots(child.children))
                      return true;
                  break;
          }
      }
      return false;
  }

  // some directive transforms (e.g. v-model) may return a symbol for runtime
  // import, which should be used instead of a resolveDirective call.
  const directiveImportMap = new WeakMap();
  // generate a JavaScript AST for this element's codegen
  const transformElement = (node, context) => {
      // perform the work on exit, after all child expressions have been
      // processed and merged.
      return function postTransformElement() {
          node = context.currentNode;
          if (!(node.type === 1 /* ELEMENT */ &&
              (node.tagType === 0 /* ELEMENT */ ||
                  node.tagType === 1 /* COMPONENT */))) {
              return;
          }
          const { tag, props } = node;
          const isComponent = node.tagType === 1 /* COMPONENT */;
          // The goal of the transform is to create a codegenNode implementing the
          // VNodeCall interface.
          const vnodeTag = isComponent
              ? resolveComponentType(node, context)
              : `"${tag}"`;
          const isDynamicComponent = isObject(vnodeTag) && vnodeTag.callee === RESOLVE_DYNAMIC_COMPONENT;
          let vnodeProps;
          let vnodeChildren;
          let vnodePatchFlag;
          let patchFlag = 0;
          let vnodeDynamicProps;
          let dynamicPropNames;
          let vnodeDirectives;
          let shouldUseBlock = 
          // dynamic component may resolve to plain elements
          isDynamicComponent ||
              vnodeTag === TELEPORT ||
              vnodeTag === SUSPENSE ||
              (!isComponent &&
                  // <svg> and <foreignObject> must be forced into blocks so that block
                  // updates inside get proper isSVG flag at runtime. (#639, #643)
                  // This is technically web-specific, but splitting the logic out of core
                  // leads to too much unnecessary complexity.
                  (tag === 'svg' ||
                      tag === 'foreignObject' ||
                      // #938: elements with dynamic keys should be forced into blocks
                      findProp(node, 'key', true)));
          // props
          if (props.length > 0) {
              const propsBuildResult = buildProps(node, context);
              vnodeProps = propsBuildResult.props;
              patchFlag = propsBuildResult.patchFlag;
              dynamicPropNames = propsBuildResult.dynamicPropNames;
              const directives = propsBuildResult.directives;
              vnodeDirectives =
                  directives && directives.length
                      ? createArrayExpression(directives.map(dir => buildDirectiveArgs(dir, context)))
                      : undefined;
          }
          // children
          if (node.children.length > 0) {
              if (vnodeTag === KEEP_ALIVE) {
                  // Although a built-in component, we compile KeepAlive with raw children
                  // instead of slot functions so that it can be used inside Transition
                  // or other Transition-wrapping HOCs.
                  // To ensure correct updates with block optimizations, we need to:
                  // 1. Force keep-alive into a block. This avoids its children being
                  //    collected by a parent block.
                  shouldUseBlock = true;
                  // 2. Force keep-alive to always be updated, since it uses raw children.
                  patchFlag |= 1024 /* DYNAMIC_SLOTS */;
                  if (node.children.length > 1) {
                      context.onError(createCompilerError(44 /* X_KEEP_ALIVE_INVALID_CHILDREN */, {
                          start: node.children[0].loc.start,
                          end: node.children[node.children.length - 1].loc.end,
                          source: ''
                      }));
                  }
              }
              const shouldBuildAsSlots = isComponent &&
                  // Teleport is not a real component and has dedicated runtime handling
                  vnodeTag !== TELEPORT &&
                  // explained above.
                  vnodeTag !== KEEP_ALIVE;
              if (shouldBuildAsSlots) {
                  const { slots, hasDynamicSlots } = buildSlots(node, context);
                  vnodeChildren = slots;
                  if (hasDynamicSlots) {
                      patchFlag |= 1024 /* DYNAMIC_SLOTS */;
                  }
              }
              else if (node.children.length === 1 && vnodeTag !== TELEPORT) {
                  const child = node.children[0];
                  const type = child.type;
                  // check for dynamic text children
                  const hasDynamicTextChild = type === 5 /* INTERPOLATION */ ||
                      type === 8 /* COMPOUND_EXPRESSION */;
                  if (hasDynamicTextChild &&
                      getConstantType(child, context) === 0 /* NOT_CONSTANT */) {
                      patchFlag |= 1 /* TEXT */;
                  }
                  // pass directly if the only child is a text node
                  // (plain / interpolation / expression)
                  if (hasDynamicTextChild || type === 2 /* TEXT */) {
                      vnodeChildren = child;
                  }
                  else {
                      vnodeChildren = node.children;
                  }
              }
              else {
                  vnodeChildren = node.children;
              }
          }
          // patchFlag & dynamicPropNames
          if (patchFlag !== 0) {
              {
                  if (patchFlag < 0) {
                      // special flags (negative and mutually exclusive)
                      vnodePatchFlag = patchFlag + ` /* ${PatchFlagNames[patchFlag]} */`;
                  }
                  else {
                      // bitwise flags
                      const flagNames = Object.keys(PatchFlagNames)
                          .map(Number)
                          .filter(n => n > 0 && patchFlag & n)
                          .map(n => PatchFlagNames[n])
                          .join(`, `);
                      vnodePatchFlag = patchFlag + ` /* ${flagNames} */`;
                  }
              }
              if (dynamicPropNames && dynamicPropNames.length) {
                  vnodeDynamicProps = stringifyDynamicPropNames(dynamicPropNames);
              }
          }
          node.codegenNode = createVNodeCall(context, vnodeTag, vnodeProps, vnodeChildren, vnodePatchFlag, vnodeDynamicProps, vnodeDirectives, !!shouldUseBlock, false /* disableTracking */, node.loc);
      };
  };
  function resolveComponentType(node, context, ssr = false) {
      const { tag } = node;
      // 1. dynamic component
      const isProp = isComponentTag(tag)
          ? findProp(node, 'is')
          : findDir(node, 'is');
      if (isProp) {
          const exp = isProp.type === 6 /* ATTRIBUTE */
              ? isProp.value && createSimpleExpression(isProp.value.content, true)
              : isProp.exp;
          if (exp) {
              return createCallExpression(context.helper(RESOLVE_DYNAMIC_COMPONENT), [
                  exp
              ]);
          }
      }
      // 2. built-in components (Teleport, Transition, KeepAlive, Suspense...)
      const builtIn = isCoreComponent(tag) || context.isBuiltInComponent(tag);
      if (builtIn) {
          // built-ins are simply fallthroughs / have special handling during ssr
          // so we don't need to import their runtime equivalents
          if (!ssr)
              context.helper(builtIn);
          return builtIn;
      }
      // 5. user component (resolve)
      context.helper(RESOLVE_COMPONENT);
      context.components.add(tag);
      return toValidAssetId(tag, `component`);
  }
  function buildProps(node, context, props = node.props, ssr = false) {
      const { tag, loc: elementLoc } = node;
      const isComponent = node.tagType === 1 /* COMPONENT */;
      let properties = [];
      const mergeArgs = [];
      const runtimeDirectives = [];
      // patchFlag analysis
      let patchFlag = 0;
      let hasRef = false;
      let hasClassBinding = false;
      let hasStyleBinding = false;
      let hasHydrationEventBinding = false;
      let hasDynamicKeys = false;
      let hasVnodeHook = false;
      const dynamicPropNames = [];
      const analyzePatchFlag = ({ key, value }) => {
          if (isStaticExp(key)) {
              const name = key.content;
              const isEventHandler = isOn(name);
              if (!isComponent &&
                  isEventHandler &&
                  // omit the flag for click handlers because hydration gives click
                  // dedicated fast path.
                  name.toLowerCase() !== 'onclick' &&
                  // omit v-model handlers
                  name !== 'onUpdate:modelValue' &&
                  // omit onVnodeXXX hooks
                  !isReservedProp(name)) {
                  hasHydrationEventBinding = true;
              }
              if (isEventHandler && isReservedProp(name)) {
                  hasVnodeHook = true;
              }
              if (value.type === 20 /* JS_CACHE_EXPRESSION */ ||
                  ((value.type === 4 /* SIMPLE_EXPRESSION */ ||
                      value.type === 8 /* COMPOUND_EXPRESSION */) &&
                      getConstantType(value, context) > 0)) {
                  // skip if the prop is a cached handler or has constant value
                  return;
              }
              if (name === 'ref') {
                  hasRef = true;
              }
              else if (name === 'class' && !isComponent) {
                  hasClassBinding = true;
              }
              else if (name === 'style' && !isComponent) {
                  hasStyleBinding = true;
              }
              else if (name !== 'key' && !dynamicPropNames.includes(name)) {
                  dynamicPropNames.push(name);
              }
          }
          else {
              hasDynamicKeys = true;
          }
      };
      for (let i = 0; i < props.length; i++) {
          // static attribute
          const prop = props[i];
          if (prop.type === 6 /* ATTRIBUTE */) {
              const { loc, name, value } = prop;
              let isStatic = true;
              if (name === 'ref') {
                  hasRef = true;
              }
              // skip :is on <component>
              if (name === 'is' && isComponentTag(tag)) {
                  continue;
              }
              properties.push(createObjectProperty(createSimpleExpression(name, true, getInnerRange(loc, 0, name.length)), createSimpleExpression(value ? value.content : '', isStatic, value ? value.loc : loc)));
          }
          else {
              // directives
              const { name, arg, exp, loc } = prop;
              const isBind = name === 'bind';
              const isOn = name === 'on';
              // skip v-slot - it is handled by its dedicated transform.
              if (name === 'slot') {
                  if (!isComponent) {
                      context.onError(createCompilerError(39 /* X_V_SLOT_MISPLACED */, loc));
                  }
                  continue;
              }
              // skip v-once - it is handled by its dedicated transform.
              if (name === 'once') {
                  continue;
              }
              // skip v-is and :is on <component>
              if (name === 'is' ||
                  (isBind && isComponentTag(tag) && isBindKey(arg, 'is'))) {
                  continue;
              }
              // skip v-on in SSR compilation
              if (isOn && ssr) {
                  continue;
              }
              // special case for v-bind and v-on with no argument
              if (!arg && (isBind || isOn)) {
                  hasDynamicKeys = true;
                  if (exp) {
                      if (properties.length) {
                          mergeArgs.push(createObjectExpression(dedupeProperties(properties), elementLoc));
                          properties = [];
                      }
                      if (isBind) {
                          mergeArgs.push(exp);
                      }
                      else {
                          // v-on="obj" -> toHandlers(obj)
                          mergeArgs.push({
                              type: 14 /* JS_CALL_EXPRESSION */,
                              loc,
                              callee: context.helper(TO_HANDLERS),
                              arguments: [exp]
                          });
                      }
                  }
                  else {
                      context.onError(createCompilerError(isBind
                          ? 33 /* X_V_BIND_NO_EXPRESSION */
                          : 34 /* X_V_ON_NO_EXPRESSION */, loc));
                  }
                  continue;
              }
              const directiveTransform = context.directiveTransforms[name];
              if (directiveTransform) {
                  // has built-in directive transform.
                  const { props, needRuntime } = directiveTransform(prop, node, context);
                  !ssr && props.forEach(analyzePatchFlag);
                  properties.push(...props);
                  if (needRuntime) {
                      runtimeDirectives.push(prop);
                      if (isSymbol(needRuntime)) {
                          directiveImportMap.set(prop, needRuntime);
                      }
                  }
              }
              else {
                  // no built-in transform, this is a user custom directive.
                  runtimeDirectives.push(prop);
              }
          }
      }
      let propsExpression = undefined;
      // has v-bind="object" or v-on="object", wrap with mergeProps
      if (mergeArgs.length) {
          if (properties.length) {
              mergeArgs.push(createObjectExpression(dedupeProperties(properties), elementLoc));
          }
          if (mergeArgs.length > 1) {
              propsExpression = createCallExpression(context.helper(MERGE_PROPS), mergeArgs, elementLoc);
          }
          else {
              // single v-bind with nothing else - no need for a mergeProps call
              propsExpression = mergeArgs[0];
          }
      }
      else if (properties.length) {
          propsExpression = createObjectExpression(dedupeProperties(properties), elementLoc);
      }
      // patchFlag analysis
      if (hasDynamicKeys) {
          patchFlag |= 16 /* FULL_PROPS */;
      }
      else {
          if (hasClassBinding) {
              patchFlag |= 2 /* CLASS */;
          }
          if (hasStyleBinding) {
              patchFlag |= 4 /* STYLE */;
          }
          if (dynamicPropNames.length) {
              patchFlag |= 8 /* PROPS */;
          }
          if (hasHydrationEventBinding) {
              patchFlag |= 32 /* HYDRATE_EVENTS */;
          }
      }
      if ((patchFlag === 0 || patchFlag === 32 /* HYDRATE_EVENTS */) &&
          (hasRef || hasVnodeHook || runtimeDirectives.length > 0)) {
          patchFlag |= 512 /* NEED_PATCH */;
      }
      return {
          props: propsExpression,
          directives: runtimeDirectives,
          patchFlag,
          dynamicPropNames
      };
  }
  // Dedupe props in an object literal.
  // Literal duplicated attributes would have been warned during the parse phase,
  // however, it's possible to encounter duplicated `onXXX` handlers with different
  // modifiers. We also need to merge static and dynamic class / style attributes.
  // - onXXX handlers / style: merge into array
  // - class: merge into single expression with concatenation
  function dedupeProperties(properties) {
      const knownProps = new Map();
      const deduped = [];
      for (let i = 0; i < properties.length; i++) {
          const prop = properties[i];
          // dynamic keys are always allowed
          if (prop.key.type === 8 /* COMPOUND_EXPRESSION */ || !prop.key.isStatic) {
              deduped.push(prop);
              continue;
          }
          const name = prop.key.content;
          const existing = knownProps.get(name);
          if (existing) {
              if (name === 'style' || name === 'class' || name.startsWith('on')) {
                  mergeAsArray(existing, prop);
              }
              // unexpected duplicate, should have emitted error during parse
          }
          else {
              knownProps.set(name, prop);
              deduped.push(prop);
          }
      }
      return deduped;
  }
  function mergeAsArray(existing, incoming) {
      if (existing.value.type === 17 /* JS_ARRAY_EXPRESSION */) {
          existing.value.elements.push(incoming.value);
      }
      else {
          existing.value = createArrayExpression([existing.value, incoming.value], existing.loc);
      }
  }
  function buildDirectiveArgs(dir, context) {
      const dirArgs = [];
      const runtime = directiveImportMap.get(dir);
      if (runtime) {
          // built-in directive with runtime
          dirArgs.push(context.helperString(runtime));
      }
      else {
          {
              // inject statement for resolving directive
              context.helper(RESOLVE_DIRECTIVE);
              context.directives.add(dir.name);
              dirArgs.push(toValidAssetId(dir.name, `directive`));
          }
      }
      const { loc } = dir;
      if (dir.exp)
          dirArgs.push(dir.exp);
      if (dir.arg) {
          if (!dir.exp) {
              dirArgs.push(`void 0`);
          }
          dirArgs.push(dir.arg);
      }
      if (Object.keys(dir.modifiers).length) {
          if (!dir.arg) {
              if (!dir.exp) {
                  dirArgs.push(`void 0`);
              }
              dirArgs.push(`void 0`);
          }
          const trueExpression = createSimpleExpression(`true`, false, loc);
          dirArgs.push(createObjectExpression(dir.modifiers.map(modifier => createObjectProperty(modifier, trueExpression)), loc));
      }
      return createArrayExpression(dirArgs, dir.loc);
  }
  function stringifyDynamicPropNames(props) {
      let propsNamesString = `[`;
      for (let i = 0, l = props.length; i < l; i++) {
          propsNamesString += JSON.stringify(props[i]);
          if (i < l - 1)
              propsNamesString += ', ';
      }
      return propsNamesString + `]`;
  }
  function isComponentTag(tag) {
      return tag[0].toLowerCase() + tag.slice(1) === 'component';
  }

  const transformSlotOutlet = (node, context) => {
      if (isSlotOutlet(node)) {
          const { children, loc } = node;
          const { slotName, slotProps } = processSlotOutlet(node, context);
          const slotArgs = [
              context.prefixIdentifiers ? `_ctx.$slots` : `$slots`,
              slotName
          ];
          if (slotProps) {
              slotArgs.push(slotProps);
          }
          if (children.length) {
              if (!slotProps) {
                  slotArgs.push(`{}`);
              }
              slotArgs.push(createFunctionExpression([], children, false, false, loc));
          }
          if (context.scopeId && !context.slotted) {
              if (!slotProps) {
                  slotArgs.push(`{}`);
              }
              if (!children.length) {
                  slotArgs.push(`undefined`);
              }
              slotArgs.push(`true`);
          }
          node.codegenNode = createCallExpression(context.helper(RENDER_SLOT), slotArgs, loc);
      }
  };
  function processSlotOutlet(node, context) {
      let slotName = `"default"`;
      let slotProps = undefined;
      const nonNameProps = [];
      for (let i = 0; i < node.props.length; i++) {
          const p = node.props[i];
          if (p.type === 6 /* ATTRIBUTE */) {
              if (p.value) {
                  if (p.name === 'name') {
                      slotName = JSON.stringify(p.value.content);
                  }
                  else {
                      p.name = camelize(p.name);
                      nonNameProps.push(p);
                  }
              }
          }
          else {
              if (p.name === 'bind' && isBindKey(p.arg, 'name')) {
                  if (p.exp)
                      slotName = p.exp;
              }
              else {
                  if (p.name === 'bind' && p.arg && isStaticExp(p.arg)) {
                      p.arg.content = camelize(p.arg.content);
                  }
                  nonNameProps.push(p);
              }
          }
      }
      if (nonNameProps.length > 0) {
          const { props, directives } = buildProps(node, context, nonNameProps);
          slotProps = props;
          if (directives.length) {
              context.onError(createCompilerError(35 /* X_V_SLOT_UNEXPECTED_DIRECTIVE_ON_SLOT_OUTLET */, directives[0].loc));
          }
      }
      return {
          slotName,
          slotProps
      };
  }

  const fnExpRE = /^\s*([\w$_]+|\([^)]*?\))\s*=>|^\s*function(?:\s+[\w$]+)?\s*\(/;
  const transformOn = (dir, node, context, augmentor) => {
      const { loc, modifiers, arg } = dir;
      if (!dir.exp && !modifiers.length) {
          context.onError(createCompilerError(34 /* X_V_ON_NO_EXPRESSION */, loc));
      }
      let eventName;
      if (arg.type === 4 /* SIMPLE_EXPRESSION */) {
          if (arg.isStatic) {
              const rawName = arg.content;
              // for all event listeners, auto convert it to camelCase. See issue #2249
              eventName = createSimpleExpression(toHandlerKey(camelize(rawName)), true, arg.loc);
          }
          else {
              // #2388
              eventName = createCompoundExpression([
                  `${context.helperString(TO_HANDLER_KEY)}(`,
                  arg,
                  `)`
              ]);
          }
      }
      else {
          // already a compound expression.
          eventName = arg;
          eventName.children.unshift(`${context.helperString(TO_HANDLER_KEY)}(`);
          eventName.children.push(`)`);
      }
      // handler processing
      let exp = dir.exp;
      if (exp && !exp.content.trim()) {
          exp = undefined;
      }
      let shouldCache = context.cacheHandlers && !exp;
      if (exp) {
          const isMemberExp = isMemberExpression(exp.content);
          const isInlineStatement = !(isMemberExp || fnExpRE.test(exp.content));
          const hasMultipleStatements = exp.content.includes(`;`);
          {
              validateBrowserExpression(exp, context, false, hasMultipleStatements);
          }
          if (isInlineStatement || (shouldCache && isMemberExp)) {
              // wrap inline statement in a function expression
              exp = createCompoundExpression([
                  `${isInlineStatement
                    ? `$event`
                    : `${``}(...args)`} => ${hasMultipleStatements ? `{` : `(`}`,
                  exp,
                  hasMultipleStatements ? `}` : `)`
              ]);
          }
      }
      let ret = {
          props: [
              createObjectProperty(eventName, exp || createSimpleExpression(`() => {}`, false, loc))
          ]
      };
      // apply extended compiler augmentor
      if (augmentor) {
          ret = augmentor(ret);
      }
      if (shouldCache) {
          // cache handlers so that it's always the same handler being passed down.
          // this avoids unnecessary re-renders when users use inline handlers on
          // components.
          ret.props[0].value = context.cache(ret.props[0].value);
      }
      return ret;
  };

  // v-bind without arg is handled directly in ./transformElements.ts due to it affecting
  // codegen for the entire props object. This transform here is only for v-bind
  // *with* args.
  const transformBind = (dir, node, context) => {
      const { exp, modifiers, loc } = dir;
      const arg = dir.arg;
      if (arg.type !== 4 /* SIMPLE_EXPRESSION */) {
          arg.children.unshift(`(`);
          arg.children.push(`) || ""`);
      }
      else if (!arg.isStatic) {
          arg.content = `${arg.content} || ""`;
      }
      // .prop is no longer necessary due to new patch behavior
      // .sync is replaced by v-model:arg
      if (modifiers.includes('camel')) {
          if (arg.type === 4 /* SIMPLE_EXPRESSION */) {
              if (arg.isStatic) {
                  arg.content = camelize(arg.content);
              }
              else {
                  arg.content = `${context.helperString(CAMELIZE)}(${arg.content})`;
              }
          }
          else {
              arg.children.unshift(`${context.helperString(CAMELIZE)}(`);
              arg.children.push(`)`);
          }
      }
      if (!exp ||
          (exp.type === 4 /* SIMPLE_EXPRESSION */ && !exp.content.trim())) {
          context.onError(createCompilerError(33 /* X_V_BIND_NO_EXPRESSION */, loc));
          return {
              props: [createObjectProperty(arg, createSimpleExpression('', true, loc))]
          };
      }
      return {
          props: [createObjectProperty(arg, exp)]
      };
  };

  // Merge adjacent text nodes and expressions into a single expression
  // e.g. <div>abc {{ d }} {{ e }}</div> should have a single expression node as child.
  const transformText = (node, context) => {
      if (node.type === 0 /* ROOT */ ||
          node.type === 1 /* ELEMENT */ ||
          node.type === 11 /* FOR */ ||
          node.type === 10 /* IF_BRANCH */) {
          // perform the transform on node exit so that all expressions have already
          // been processed.
          return () => {
              const children = node.children;
              let currentContainer = undefined;
              let hasText = false;
              for (let i = 0; i < children.length; i++) {
                  const child = children[i];
                  if (isText(child)) {
                      hasText = true;
                      for (let j = i + 1; j < children.length; j++) {
                          const next = children[j];
                          if (isText(next)) {
                              if (!currentContainer) {
                                  currentContainer = children[i] = {
                                      type: 8 /* COMPOUND_EXPRESSION */,
                                      loc: child.loc,
                                      children: [child]
                                  };
                              }
                              // merge adjacent text node into current
                              currentContainer.children.push(` + `, next);
                              children.splice(j, 1);
                              j--;
                          }
                          else {
                              currentContainer = undefined;
                              break;
                          }
                      }
                  }
              }
              if (!hasText ||
                  // if this is a plain element with a single text child, leave it
                  // as-is since the runtime has dedicated fast path for this by directly
                  // setting textContent of the element.
                  // for component root it's always normalized anyway.
                  (children.length === 1 &&
                      (node.type === 0 /* ROOT */ ||
                          (node.type === 1 /* ELEMENT */ &&
                              node.tagType === 0 /* ELEMENT */)))) {
                  return;
              }
              // pre-convert text nodes into createTextVNode(text) calls to avoid
              // runtime normalization.
              for (let i = 0; i < children.length; i++) {
                  const child = children[i];
                  if (isText(child) || child.type === 8 /* COMPOUND_EXPRESSION */) {
                      const callArgs = [];
                      // createTextVNode defaults to single whitespace, so if it is a
                      // single space the code could be an empty call to save bytes.
                      if (child.type !== 2 /* TEXT */ || child.content !== ' ') {
                          callArgs.push(child);
                      }
                      // mark dynamic text with flag so it gets patched inside a block
                      if (!context.ssr &&
                          getConstantType(child, context) === 0 /* NOT_CONSTANT */) {
                          callArgs.push(1 /* TEXT */ +
                              (` /* ${PatchFlagNames[1 /* TEXT */]} */` ));
                      }
                      children[i] = {
                          type: 12 /* TEXT_CALL */,
                          content: child,
                          loc: child.loc,
                          codegenNode: createCallExpression(context.helper(CREATE_TEXT), callArgs)
                      };
                  }
              }
          };
      }
  };

  const seen = new WeakSet();
  const transformOnce = (node, context) => {
      if (node.type === 1 /* ELEMENT */ && findDir(node, 'once', true)) {
          if (seen.has(node)) {
              return;
          }
          seen.add(node);
          context.helper(SET_BLOCK_TRACKING);
          return () => {
              const cur = context.currentNode;
              if (cur.codegenNode) {
                  cur.codegenNode = context.cache(cur.codegenNode, true /* isVNode */);
              }
          };
      }
  };

  const transformModel = (dir, node, context) => {
      const { exp, arg } = dir;
      if (!exp) {
          context.onError(createCompilerError(40 /* X_V_MODEL_NO_EXPRESSION */, dir.loc));
          return createTransformProps();
      }
      const rawExp = exp.loc.source;
      const expString = exp.type === 4 /* SIMPLE_EXPRESSION */ ? exp.content : rawExp;
      // im SFC <script setup> inline mode, the exp may have been transformed into
      // _unref(exp)
      context.bindingMetadata[rawExp];
      const maybeRef = !true    /* SETUP_CONST */;
      if (!isMemberExpression(expString) && !maybeRef) {
          context.onError(createCompilerError(41 /* X_V_MODEL_MALFORMED_EXPRESSION */, exp.loc));
          return createTransformProps();
      }
      const propName = arg ? arg : createSimpleExpression('modelValue', true);
      const eventName = arg
          ? isStaticExp(arg)
              ? `onUpdate:${arg.content}`
              : createCompoundExpression(['"onUpdate:" + ', arg])
          : `onUpdate:modelValue`;
      let assignmentExp;
      const eventArg = context.isTS ? `($event: any)` : `$event`;
      {
          assignmentExp = createCompoundExpression([
              `${eventArg} => (`,
              exp,
              ` = $event)`
          ]);
      }
      const props = [
          // modelValue: foo
          createObjectProperty(propName, dir.exp),
          // "onUpdate:modelValue": $event => (foo = $event)
          createObjectProperty(eventName, assignmentExp)
      ];
      // modelModifiers: { foo: true, "bar-baz": true }
      if (dir.modifiers.length && node.tagType === 1 /* COMPONENT */) {
          const modifiers = dir.modifiers
              .map(m => (isSimpleIdentifier(m) ? m : JSON.stringify(m)) + `: true`)
              .join(`, `);
          const modifiersKey = arg
              ? isStaticExp(arg)
                  ? `${arg.content}Modifiers`
                  : createCompoundExpression([arg, ' + "Modifiers"'])
              : `modelModifiers`;
          props.push(createObjectProperty(modifiersKey, createSimpleExpression(`{ ${modifiers} }`, false, dir.loc, 2 /* CAN_HOIST */)));
      }
      return createTransformProps(props);
  };
  function createTransformProps(props = []) {
      return { props };
  }

  function getBaseTransformPreset(prefixIdentifiers) {
      return [
          [
              transformOnce,
              transformIf,
              transformFor,
              ...([transformExpression]
                      ),
              transformSlotOutlet,
              transformElement,
              trackSlotScopes,
              transformText
          ],
          {
              on: transformOn,
              bind: transformBind,
              model: transformModel
          }
      ];
  }
  // we name it `baseCompile` so that higher order compilers like
  // @vue/compiler-dom can export `compile` while re-exporting everything else.
  function baseCompile(template, options = {}) {
      const onError = options.onError || defaultOnError;
      const isModuleMode = options.mode === 'module';
      /* istanbul ignore if */
      {
          if (options.prefixIdentifiers === true) {
              onError(createCompilerError(45 /* X_PREFIX_ID_NOT_SUPPORTED */));
          }
          else if (isModuleMode) {
              onError(createCompilerError(46 /* X_MODULE_MODE_NOT_SUPPORTED */));
          }
      }
      const prefixIdentifiers = !true ;
      if (options.cacheHandlers) {
          onError(createCompilerError(47 /* X_CACHE_HANDLER_NOT_SUPPORTED */));
      }
      if (options.scopeId && !isModuleMode) {
          onError(createCompilerError(48 /* X_SCOPE_ID_NOT_SUPPORTED */));
      }
      const ast = isString(template) ? baseParse(template, options) : template;
      const [nodeTransforms, directiveTransforms] = getBaseTransformPreset();
      transform(ast, extend({}, options, {
          prefixIdentifiers,
          nodeTransforms: [
              ...nodeTransforms,
              ...(options.nodeTransforms || []) // user transforms
          ],
          directiveTransforms: extend({}, directiveTransforms, options.directiveTransforms || {} // user transforms
          )
      }));
      return generate(ast, extend({}, options, {
          prefixIdentifiers
      }));
  }

  const noopDirectiveTransform = () => ({ props: [] });

  const V_MODEL_RADIO = Symbol(`vModelRadio` );
  const V_MODEL_CHECKBOX = Symbol(`vModelCheckbox` );
  const V_MODEL_TEXT = Symbol(`vModelText` );
  const V_MODEL_SELECT = Symbol(`vModelSelect` );
  const V_MODEL_DYNAMIC = Symbol(`vModelDynamic` );
  const V_ON_WITH_MODIFIERS = Symbol(`vOnModifiersGuard` );
  const V_ON_WITH_KEYS = Symbol(`vOnKeysGuard` );
  const V_SHOW = Symbol(`vShow` );
  const TRANSITION$1 = Symbol(`Transition` );
  const TRANSITION_GROUP = Symbol(`TransitionGroup` );
  registerRuntimeHelpers({
      [V_MODEL_RADIO]: `vModelRadio`,
      [V_MODEL_CHECKBOX]: `vModelCheckbox`,
      [V_MODEL_TEXT]: `vModelText`,
      [V_MODEL_SELECT]: `vModelSelect`,
      [V_MODEL_DYNAMIC]: `vModelDynamic`,
      [V_ON_WITH_MODIFIERS]: `withModifiers`,
      [V_ON_WITH_KEYS]: `withKeys`,
      [V_SHOW]: `vShow`,
      [TRANSITION$1]: `Transition`,
      [TRANSITION_GROUP]: `TransitionGroup`
  });

  /* eslint-disable no-restricted-globals */
  let decoder;
  function decodeHtmlBrowser(raw) {
      (decoder || (decoder = document.createElement('div'))).innerHTML = raw;
      return decoder.textContent;
  }

  const isRawTextContainer = /*#__PURE__*/ makeMap('style,iframe,script,noscript', true);
  const parserOptions = {
      isVoidTag,
      isNativeTag: tag => isHTMLTag(tag) || isSVGTag(tag),
      isPreTag: tag => tag === 'pre',
      decodeEntities: decodeHtmlBrowser ,
      isBuiltInComponent: (tag) => {
          if (isBuiltInType(tag, `Transition`)) {
              return TRANSITION$1;
          }
          else if (isBuiltInType(tag, `TransitionGroup`)) {
              return TRANSITION_GROUP;
          }
      },
      // https://html.spec.whatwg.org/multipage/parsing.html#tree-construction-dispatcher
      getNamespace(tag, parent) {
          let ns = parent ? parent.ns : 0 /* HTML */;
          if (parent && ns === 2 /* MATH_ML */) {
              if (parent.tag === 'annotation-xml') {
                  if (tag === 'svg') {
                      return 1 /* SVG */;
                  }
                  if (parent.props.some(a => a.type === 6 /* ATTRIBUTE */ &&
                      a.name === 'encoding' &&
                      a.value != null &&
                      (a.value.content === 'text/html' ||
                          a.value.content === 'application/xhtml+xml'))) {
                      ns = 0 /* HTML */;
                  }
              }
              else if (/^m(?:[ions]|text)$/.test(parent.tag) &&
                  tag !== 'mglyph' &&
                  tag !== 'malignmark') {
                  ns = 0 /* HTML */;
              }
          }
          else if (parent && ns === 1 /* SVG */) {
              if (parent.tag === 'foreignObject' ||
                  parent.tag === 'desc' ||
                  parent.tag === 'title') {
                  ns = 0 /* HTML */;
              }
          }
          if (ns === 0 /* HTML */) {
              if (tag === 'svg') {
                  return 1 /* SVG */;
              }
              if (tag === 'math') {
                  return 2 /* MATH_ML */;
              }
          }
          return ns;
      },
      // https://html.spec.whatwg.org/multipage/parsing.html#parsing-html-fragments
      getTextMode({ tag, ns }) {
          if (ns === 0 /* HTML */) {
              if (tag === 'textarea' || tag === 'title') {
                  return 1 /* RCDATA */;
              }
              if (isRawTextContainer(tag)) {
                  return 2 /* RAWTEXT */;
              }
          }
          return 0 /* DATA */;
      }
  };

  // Parse inline CSS strings for static style attributes into an object.
  // This is a NodeTransform since it works on the static `style` attribute and
  // converts it into a dynamic equivalent:
  // style="color: red" -> :style='{ "color": "red" }'
  // It is then processed by `transformElement` and included in the generated
  // props.
  const transformStyle = node => {
      if (node.type === 1 /* ELEMENT */) {
          node.props.forEach((p, i) => {
              if (p.type === 6 /* ATTRIBUTE */ && p.name === 'style' && p.value) {
                  // replace p with an expression node
                  node.props[i] = {
                      type: 7 /* DIRECTIVE */,
                      name: `bind`,
                      arg: createSimpleExpression(`style`, true, p.loc),
                      exp: parseInlineCSS(p.value.content, p.loc),
                      modifiers: [],
                      loc: p.loc
                  };
              }
          });
      }
  };
  const parseInlineCSS = (cssText, loc) => {
      const normalized = parseStringStyle(cssText);
      return createSimpleExpression(JSON.stringify(normalized), false, loc, 3 /* CAN_STRINGIFY */);
  };

  function createDOMCompilerError(code, loc) {
      return createCompilerError(code, loc, DOMErrorMessages );
  }
  const DOMErrorMessages = {
      [49 /* X_V_HTML_NO_EXPRESSION */]: `v-html is missing expression.`,
      [50 /* X_V_HTML_WITH_CHILDREN */]: `v-html will override element children.`,
      [51 /* X_V_TEXT_NO_EXPRESSION */]: `v-text is missing expression.`,
      [52 /* X_V_TEXT_WITH_CHILDREN */]: `v-text will override element children.`,
      [53 /* X_V_MODEL_ON_INVALID_ELEMENT */]: `v-model can only be used on <input>, <textarea> and <select> elements.`,
      [54 /* X_V_MODEL_ARG_ON_ELEMENT */]: `v-model argument is not supported on plain elements.`,
      [55 /* X_V_MODEL_ON_FILE_INPUT_ELEMENT */]: `v-model cannot be used on file inputs since they are read-only. Use a v-on:change listener instead.`,
      [56 /* X_V_MODEL_UNNECESSARY_VALUE */]: `Unnecessary value binding used alongside v-model. It will interfere with v-model's behavior.`,
      [57 /* X_V_SHOW_NO_EXPRESSION */]: `v-show is missing expression.`,
      [58 /* X_TRANSITION_INVALID_CHILDREN */]: `<Transition> expects exactly one child element or component.`,
      [59 /* X_IGNORED_SIDE_EFFECT_TAG */]: `Tags with side effect (<script> and <style>) are ignored in client component templates.`
  };

  const transformVHtml = (dir, node, context) => {
      const { exp, loc } = dir;
      if (!exp) {
          context.onError(createDOMCompilerError(49 /* X_V_HTML_NO_EXPRESSION */, loc));
      }
      if (node.children.length) {
          context.onError(createDOMCompilerError(50 /* X_V_HTML_WITH_CHILDREN */, loc));
          node.children.length = 0;
      }
      return {
          props: [
              createObjectProperty(createSimpleExpression(`innerHTML`, true, loc), exp || createSimpleExpression('', true))
          ]
      };
  };

  const transformVText = (dir, node, context) => {
      const { exp, loc } = dir;
      if (!exp) {
          context.onError(createDOMCompilerError(51 /* X_V_TEXT_NO_EXPRESSION */, loc));
      }
      if (node.children.length) {
          context.onError(createDOMCompilerError(52 /* X_V_TEXT_WITH_CHILDREN */, loc));
          node.children.length = 0;
      }
      return {
          props: [
              createObjectProperty(createSimpleExpression(`textContent`, true), exp
                  ? createCallExpression(context.helperString(TO_DISPLAY_STRING), [exp], loc)
                  : createSimpleExpression('', true))
          ]
      };
  };

  const transformModel$1 = (dir, node, context) => {
      const baseResult = transformModel(dir, node, context);
      // base transform has errors OR component v-model (only need props)
      if (!baseResult.props.length || node.tagType === 1 /* COMPONENT */) {
          return baseResult;
      }
      if (dir.arg) {
          context.onError(createDOMCompilerError(54 /* X_V_MODEL_ARG_ON_ELEMENT */, dir.arg.loc));
      }
      function checkDuplicatedValue() {
          const value = findProp(node, 'value');
          if (value) {
              context.onError(createDOMCompilerError(56 /* X_V_MODEL_UNNECESSARY_VALUE */, value.loc));
          }
      }
      const { tag } = node;
      const isCustomElement = context.isCustomElement(tag);
      if (tag === 'input' ||
          tag === 'textarea' ||
          tag === 'select' ||
          isCustomElement) {
          let directiveToUse = V_MODEL_TEXT;
          let isInvalidType = false;
          if (tag === 'input' || isCustomElement) {
              const type = findProp(node, `type`);
              if (type) {
                  if (type.type === 7 /* DIRECTIVE */) {
                      // :type="foo"
                      directiveToUse = V_MODEL_DYNAMIC;
                  }
                  else if (type.value) {
                      switch (type.value.content) {
                          case 'radio':
                              directiveToUse = V_MODEL_RADIO;
                              break;
                          case 'checkbox':
                              directiveToUse = V_MODEL_CHECKBOX;
                              break;
                          case 'file':
                              isInvalidType = true;
                              context.onError(createDOMCompilerError(55 /* X_V_MODEL_ON_FILE_INPUT_ELEMENT */, dir.loc));
                              break;
                          default:
                              // text type
                              checkDuplicatedValue();
                              break;
                      }
                  }
              }
              else if (hasDynamicKeyVBind(node)) {
                  // element has bindings with dynamic keys, which can possibly contain
                  // "type".
                  directiveToUse = V_MODEL_DYNAMIC;
              }
              else {
                  // text type
                  checkDuplicatedValue();
              }
          }
          else if (tag === 'select') {
              directiveToUse = V_MODEL_SELECT;
          }
          else {
              // textarea
              checkDuplicatedValue();
          }
          // inject runtime directive
          // by returning the helper symbol via needRuntime
          // the import will replaced a resolveDirective call.
          if (!isInvalidType) {
              baseResult.needRuntime = context.helper(directiveToUse);
          }
      }
      else {
          context.onError(createDOMCompilerError(53 /* X_V_MODEL_ON_INVALID_ELEMENT */, dir.loc));
      }
      // native vmodel doesn't need the `modelValue` props since they are also
      // passed to the runtime as `binding.value`. removing it reduces code size.
      baseResult.props = baseResult.props.filter(p => !(p.key.type === 4 /* SIMPLE_EXPRESSION */ &&
          p.key.content === 'modelValue'));
      return baseResult;
  };

  const isEventOptionModifier = /*#__PURE__*/ makeMap(`passive,once,capture`);
  const isNonKeyModifier = /*#__PURE__*/ makeMap(
  // event propagation management
`stop,prevent,self,`   +
      // system modifiers + exact
      `ctrl,shift,alt,meta,exact,` +
      // mouse
      `middle`);
  // left & right could be mouse or key modifiers based on event type
  const maybeKeyModifier = /*#__PURE__*/ makeMap('left,right');
  const isKeyboardEvent = /*#__PURE__*/ makeMap(`onkeyup,onkeydown,onkeypress`, true);
  const resolveModifiers = (key, modifiers) => {
      const keyModifiers = [];
      const nonKeyModifiers = [];
      const eventOptionModifiers = [];
      for (let i = 0; i < modifiers.length; i++) {
          const modifier = modifiers[i];
          if (isEventOptionModifier(modifier)) {
              // eventOptionModifiers: modifiers for addEventListener() options,
              // e.g. .passive & .capture
              eventOptionModifiers.push(modifier);
          }
          else {
              // runtimeModifiers: modifiers that needs runtime guards
              if (maybeKeyModifier(modifier)) {
                  if (isStaticExp(key)) {
                      if (isKeyboardEvent(key.content)) {
                          keyModifiers.push(modifier);
                      }
                      else {
                          nonKeyModifiers.push(modifier);
                      }
                  }
                  else {
                      keyModifiers.push(modifier);
                      nonKeyModifiers.push(modifier);
                  }
              }
              else {
                  if (isNonKeyModifier(modifier)) {
                      nonKeyModifiers.push(modifier);
                  }
                  else {
                      keyModifiers.push(modifier);
                  }
              }
          }
      }
      return {
          keyModifiers,
          nonKeyModifiers,
          eventOptionModifiers
      };
  };
  const transformClick = (key, event) => {
      const isStaticClick = isStaticExp(key) && key.content.toLowerCase() === 'onclick';
      return isStaticClick
          ? createSimpleExpression(event, true)
          : key.type !== 4 /* SIMPLE_EXPRESSION */
              ? createCompoundExpression([
                  `(`,
                  key,
                  `) === "onClick" ? "${event}" : (`,
                  key,
                  `)`
              ])
              : key;
  };
  const transformOn$1 = (dir, node, context) => {
      return transformOn(dir, node, context, baseResult => {
          const { modifiers } = dir;
          if (!modifiers.length)
              return baseResult;
          let { key, value: handlerExp } = baseResult.props[0];
          const { keyModifiers, nonKeyModifiers, eventOptionModifiers } = resolveModifiers(key, modifiers);
          // normalize click.right and click.middle since they don't actually fire
          if (nonKeyModifiers.includes('right')) {
              key = transformClick(key, `onContextmenu`);
          }
          if (nonKeyModifiers.includes('middle')) {
              key = transformClick(key, `onMouseup`);
          }
          if (nonKeyModifiers.length) {
              handlerExp = createCallExpression(context.helper(V_ON_WITH_MODIFIERS), [
                  handlerExp,
                  JSON.stringify(nonKeyModifiers)
              ]);
          }
          if (keyModifiers.length &&
              // if event name is dynamic, always wrap with keys guard
              (!isStaticExp(key) || isKeyboardEvent(key.content))) {
              handlerExp = createCallExpression(context.helper(V_ON_WITH_KEYS), [
                  handlerExp,
                  JSON.stringify(keyModifiers)
              ]);
          }
          if (eventOptionModifiers.length) {
              const modifierPostfix = eventOptionModifiers.map(capitalize).join('');
              key = isStaticExp(key)
                  ? createSimpleExpression(`${key.content}${modifierPostfix}`, true)
                  : createCompoundExpression([`(`, key, `) + "${modifierPostfix}"`]);
          }
          return {
              props: [createObjectProperty(key, handlerExp)]
          };
      });
  };

  const transformShow = (dir, node, context) => {
      const { exp, loc } = dir;
      if (!exp) {
          context.onError(createDOMCompilerError(57 /* X_V_SHOW_NO_EXPRESSION */, loc));
      }
      return {
          props: [],
          needRuntime: context.helper(V_SHOW)
      };
  };

  const warnTransitionChildren = (node, context) => {
      if (node.type === 1 /* ELEMENT */ &&
          node.tagType === 1 /* COMPONENT */) {
          const component = context.isBuiltInComponent(node.tag);
          if (component === TRANSITION$1) {
              return () => {
                  if (node.children.length && hasMultipleChildren(node)) {
                      context.onError(createDOMCompilerError(58 /* X_TRANSITION_INVALID_CHILDREN */, {
                          start: node.children[0].loc.start,
                          end: node.children[node.children.length - 1].loc.end,
                          source: ''
                      }));
                  }
              };
          }
      }
  };
  function hasMultipleChildren(node) {
      // #1352 filter out potential comment nodes.
      const children = (node.children = node.children.filter(c => c.type !== 3 /* COMMENT */));
      const child = children[0];
      return (children.length !== 1 ||
          child.type === 11 /* FOR */ ||
          (child.type === 9 /* IF */ && child.branches.some(hasMultipleChildren)));
  }

  const ignoreSideEffectTags = (node, context) => {
      if (node.type === 1 /* ELEMENT */ &&
          node.tagType === 0 /* ELEMENT */ &&
          (node.tag === 'script' || node.tag === 'style')) {
          context.onError(createDOMCompilerError(59 /* X_IGNORED_SIDE_EFFECT_TAG */, node.loc));
          context.removeNode();
      }
  };

  const DOMNodeTransforms = [
      transformStyle,
      ...([warnTransitionChildren] )
  ];
  const DOMDirectiveTransforms = {
      cloak: noopDirectiveTransform,
      html: transformVHtml,
      text: transformVText,
      model: transformModel$1,
      on: transformOn$1,
      show: transformShow
  };
  function compile$1(template, options = {}) {
      return baseCompile(template, extend({}, parserOptions, options, {
          nodeTransforms: [
              // ignore <script> and <tag>
              // this is not put inside DOMNodeTransforms because that list is used
              // by compiler-ssr to generate vnode fallback branches
              ignoreSideEffectTags,
              ...DOMNodeTransforms,
              ...(options.nodeTransforms || [])
          ],
          directiveTransforms: extend({}, DOMDirectiveTransforms, options.directiveTransforms || {}),
          transformHoist: null 
      }));
  }

  // This entry is the "full-build" that includes both the runtime
  {
      initDev();
  }
  const compileCache = Object.create(null);
  function compileToFunction(template, options) {
      if (!isString(template)) {
          if (template.nodeType) {
              template = template.innerHTML;
          }
          else {
              warn(`invalid template option: `, template);
              return NOOP;
          }
      }
      const key = template;
      const cached = compileCache[key];
      if (cached) {
          return cached;
      }
      if (template[0] === '#') {
          const el = document.querySelector(template);
          if (!el) {
              warn(`Template element not found or is empty: ${template}`);
          }
          // __UNSAFE__
          // Reason: potential execution of JS expressions in in-DOM template.
          // The user must make sure the in-DOM template is trusted. If it's rendered
          // by the server, the template should not contain any user data.
          template = el ? el.innerHTML : ``;
      }
      const { code } = compile$1(template, extend({
          hoistStatic: true,
          onError(err) {
              {
                  const message = `Template compilation error: ${err.message}`;
                  const codeFrame = err.loc &&
                      generateCodeFrame(template, err.loc.start.offset, err.loc.end.offset);
                  warn(codeFrame ? `${message}\n${codeFrame}` : message);
              }
          }
      }, options));
      // The wildcard import results in a huge object with every export
      // with keys that cannot be mangled, and can be quite heavy size-wise.
      // In the global build we know `Vue` is available globally so we can avoid
      // the wildcard object.
      const render = (new Function('Vue', code)(runtimeDom));
      render._rc = true;
      return (compileCache[key] = render);
  }
  registerRuntimeCompiler(compileToFunction);

  var Vue = /*#__PURE__*/Object.freeze({
    __proto__: null,
    BaseTransition: BaseTransition,
    Comment: Comment,
    Fragment: Fragment,
    KeepAlive: KeepAlive,
    Static: Static,
    Suspense: Suspense,
    Teleport: Teleport,
    Text: Text,
    Transition: Transition,
    TransitionGroup: TransitionGroup,
    callWithAsyncErrorHandling: callWithAsyncErrorHandling,
    callWithErrorHandling: callWithErrorHandling,
    camelize: camelize,
    capitalize: capitalize,
    cloneVNode: cloneVNode,
    compile: compileToFunction,
    computed: computed$1,
    createApp: createApp,
    createBlock: createBlock,
    createCommentVNode: createCommentVNode,
    createHydrationRenderer: createHydrationRenderer,
    createRenderer: createRenderer,
    createSSRApp: createSSRApp,
    createSlots: createSlots,
    createStaticVNode: createStaticVNode,
    createTextVNode: createTextVNode,
    createVNode: createVNode,
    customRef: customRef,
    defineAsyncComponent: defineAsyncComponent,
    defineComponent: defineComponent,
    defineEmit: defineEmit,
    defineProps: defineProps,
    get devtools () { return devtools; },
    getCurrentInstance: getCurrentInstance,
    getTransitionRawChildren: getTransitionRawChildren,
    h: h,
    handleError: handleError,
    hydrate: hydrate,
    initCustomFormatter: initCustomFormatter,
    inject: inject,
    isProxy: isProxy,
    isReactive: isReactive,
    isReadonly: isReadonly,
    isRef: isRef,
    isRuntimeOnly: isRuntimeOnly,
    isVNode: isVNode,
    markRaw: markRaw,
    mergeProps: mergeProps,
    nextTick: nextTick,
    onActivated: onActivated,
    onBeforeMount: onBeforeMount,
    onBeforeUnmount: onBeforeUnmount,
    onBeforeUpdate: onBeforeUpdate,
    onDeactivated: onDeactivated,
    onErrorCaptured: onErrorCaptured,
    onMounted: onMounted,
    onRenderTracked: onRenderTracked,
    onRenderTriggered: onRenderTriggered,
    onUnmounted: onUnmounted,
    onUpdated: onUpdated,
    openBlock: openBlock,
    popScopeId: popScopeId,
    provide: provide,
    proxyRefs: proxyRefs,
    pushScopeId: pushScopeId,
    queuePostFlushCb: queuePostFlushCb,
    reactive: reactive,
    readonly: readonly,
    ref: ref,
    registerRuntimeCompiler: registerRuntimeCompiler,
    render: render$8,
    renderList: renderList,
    renderSlot: renderSlot,
    resolveComponent: resolveComponent,
    resolveDirective: resolveDirective,
    resolveDynamicComponent: resolveDynamicComponent,
    resolveTransitionHooks: resolveTransitionHooks,
    setBlockTracking: setBlockTracking,
    setDevtoolsHook: setDevtoolsHook,
    setTransitionHooks: setTransitionHooks,
    shallowReactive: shallowReactive,
    shallowReadonly: shallowReadonly,
    shallowRef: shallowRef,
    ssrContextKey: ssrContextKey,
    ssrUtils: ssrUtils,
    toDisplayString: toDisplayString,
    toHandlerKey: toHandlerKey,
    toHandlers: toHandlers,
    toRaw: toRaw,
    toRef: toRef,
    toRefs: toRefs,
    transformVNodeArgs: transformVNodeArgs,
    triggerRef: triggerRef,
    unref: unref,
    useContext: useContext,
    useCssModule: useCssModule,
    useCssVars: useCssVars,
    useSSRContext: useSSRContext,
    useTransitionState: useTransitionState,
    vModelCheckbox: vModelCheckbox,
    vModelDynamic: vModelDynamic,
    vModelRadio: vModelRadio,
    vModelSelect: vModelSelect,
    vModelText: vModelText,
    vShow: vShow,
    version: version,
    warn: warn,
    watch: watch,
    watchEffect: watchEffect,
    withCtx: withCtx,
    withDirectives: withDirectives,
    withKeys: withKeys,
    withModifiers: withModifiers,
    withScopeId: withScopeId
  });

  var script$a = defineComponent({
      components: {
      },
      props: {
  	id: String,
      },
      emits: [],
      /** This method is the first method of the component called, it's called before html template creation. */
      created() {
      },
      data() {
  	return {
  	    show_alert: false,
  	    i18n: (t) => i18n(t),
  	    body: "",
  	};
      },
      /** This method is the first method called after html template creation. */
      mounted() {
  	ntopng_events_manager.on_custom_event(this.$props["id"], ntopng_custom_events.SHOW_GLOBAL_ALERT_INFO, (html_text) => this.show(html_text));	
      },
      methods: {
  	close: function() {
  	    this.show_alert = false;
  	},
  	show: function(body) {
  	    this.show_alert = true;
  	    this.body = body;
  	},
      },
  });

  const _hoisted_1$9 = {
    key: 0,
    style: {"width":"100%"},
    class: "alert alert-success alert-dismissable"
  };

  function render$7(_ctx, _cache, $props, $setup, $data, $options) {
    return (_ctx.show_alert == true)
      ? (openBlock(), createBlock("div", _hoisted_1$9, [
          createVNode("span", { innerHTML: _ctx.body }, null, 8 /* PROPS */, ["innerHTML"]),
          createVNode("button", {
            type: "button",
            onClick: _cache[1] || (_cache[1] = (...args) => (_ctx.close && _ctx.close(...args))),
            class: "btn-close",
            "aria-label": "Close"
          })
        ]))
      : createCommentVNode("v-if", true)
  }

  script$a.render = render$7;
  script$a.__file = "http_src/vue/alert-info.vue";

  var script$9 = {
      components: {
      },
      props: {
  	id: String,
  	base_url_request: String,
      },
      emits: ["apply", "hidden", "showed"],
      /** This method is the first method of the component called, it's called before html template creation. */
      created() {
      },
      data() {
  	return {
  	    chart: null,
  	    chart_options: null,
  	    from_zoom: false,
  	    //i18n: (t) => i18n(t),
  	};
      },
      /** This method is the first method called after html template creation. */
      async mounted() {
  	await this.init();
  	ntopng_sync.ready(this.$props["id"]);
      },
      methods: {
  	init: async function() {
  	    let url_request = this.get_url_request();
  	    ntopng_status_manager.on_status_change(this.id, (new_status) => {
  		if (this.from_zoom == true) {
  		    this.from_zoom = false;
  		    //return;
  		}
  		let new_url_request = this.get_url_request();
  		if (new_url_request == url_request) {
  		    return;
  		}
  		this.update_chart(new_url_request);
  	    }, false);
  	    await this.draw_chart(url_request);
  	},	
  	get_url_request: function() {
  	    let url_params = ntopng_url_manager.get_url_params();
  	    return `${this.base_url_request}?${url_params}`;
  	},
  	draw_chart: async function(url_request) {
  	    let chartApex = ntopChartApex;
  	    let chart_type = chartApex.typeChart.TS_STACKED;
  	    this.chart = chartApex.newChart(chart_type);
  	    this.chart.registerEvent("zoomed", (chart_context, axis) => this.on_zoomed(chart_context, axis));
  	    let chart_options = await ntopng_utility.http_request(url_request);
  	    this.chart.drawChart(this.$refs["chart"], chart_options);
  	},
  	update_chart: async function(url_request) {
  	    let chart_options = await ntopng_utility.http_request(url_request);
  	    this.chart.updateChart(chart_options);
  	},
  	on_zoomed: function(chart_context, { xaxis, yaxis }) {
  	    this.from_zoom = true;
              const begin = moment(xaxis.min);
              const end = moment(xaxis.max);
              // the timestamps are in milliseconds, convert them into seconds
  	    let new_epoch_status = { epoch_begin: Number.parseInt(begin.unix()), epoch_end: Number.parseInt(end.unix()) };
  	    ntopng_events_manager.emit_event(ntopng_events.EPOCH_CHANGE, new_epoch_status, this.id);
  	},
      },
  };

  const _hoisted_1$8 = {
    style: {"width":"100%"},
    ref: "chart"
  };

  function render$6(_ctx, _cache, $props, $setup, $data, $options) {
    return (openBlock(), createBlock("div", _hoisted_1$8, null, 512 /* NEED_PATCH */))
  }

  script$9.render = render$6;
  script$9.__file = "http_src/vue/chart.vue";

  var script$8 = defineComponent({
      components: {
      },
      props: {
  	id: String,
      },
      emits: ["apply", "hidden", "showed"],
      /** This method is the first method of the component called, it's called before html template creation. */
      created() {
      },
      data() {
  	return {
  	    //i18n: (t) => i18n(t),
  	};
      },
      /** This method is the first method called after html template creation. */
      mounted() {
  	let me = this;
  	$(this.$refs["modal_id"]).on('shown.bs.modal', function (e) {
  	    me.$emit("showed");
  	});
  	$(this.$refs["modal_id"]).on('hidden.bs.modal', function (e) {
  	    me.$emit("hidden");
  	});
  	// notifies that component is ready
  	ntopng_sync.ready(this.$props["id"]);
      },
      methods: {
  	show: function() {
  	    $(this.$refs["modal_id"]).modal("show");
  	},
  	apply: function() {
  	    $(this.$refs["modal_id"]).modal("hide");
  	    this.$emit("apply");
  	},
  	close: function() {
  	    $(this.$refs["modal_id"]).modal("hide");
  	},
      },
  });

  const _hoisted_1$7 = {
    class: "modal fade",
    ref: "modal_id",
    tabindex: "-1",
    role: "dialog",
    "aria-labelledby": "dt-add-filter-modal-title",
    "aria-hidden": "true"
  };
  const _hoisted_2$6 = {
    class: "modal-dialog modal-dialog-centered modal-lg",
    role: "document"
  };
  const _hoisted_3$6 = { class: "modal-content" };
  const _hoisted_4$6 = { class: "modal-header" };
  const _hoisted_5$6 = { class: "modal-title" };
  const _hoisted_6$6 = /*#__PURE__*/createVNode("div", { class: "modal-close" }, [
    /*#__PURE__*/createVNode("button", {
      type: "button",
      class: "btn-close",
      "data-bs-dismiss": "modal",
      "aria-label": "Close"
    })
  ], -1 /* HOISTED */);
  const _hoisted_7$6 = { class: "modal-body" };
  const _hoisted_8$5 = { class: "modal-footer" };
  const _hoisted_9$5 = /*#__PURE__*/createVNode("div", { class: "mr-auto" }, null, -1 /* HOISTED */);
  const _hoisted_10$5 = /*#__PURE__*/createVNode("div", {
    class: "alert alert-info test-feedback w-100",
    style: {"display":"none"}
  }, null, -1 /* HOISTED */);

  function render$5(_ctx, _cache, $props, $setup, $data, $options) {
    return (openBlock(), createBlock("div", _hoisted_1$7, [
      createVNode("div", _hoisted_2$6, [
        createVNode("div", _hoisted_3$6, [
          createVNode("div", _hoisted_4$6, [
            createVNode("h5", _hoisted_5$6, [
              renderSlot(_ctx.$slots, "title")
            ]),
            _hoisted_6$6
          ]),
          createVNode("div", _hoisted_7$6, [
            renderSlot(_ctx.$slots, "body")
          ]),
          createVNode("div", _hoisted_8$5, [
            _hoisted_9$5,
            renderSlot(_ctx.$slots, "footer"),
            _hoisted_10$5
          ])
        ])
      ])
    ], 512 /* NEED_PATCH */))
  }

  script$8.render = render$5;
  script$8.__file = "http_src/vue/modal.vue";

  pushScopeId("data-v-6e68bac7");
  const _hoisted_1$6 = /*#__PURE__*/createVNode("tbody", null, null, -1 /* HOISTED */);
  popScopeId();


  var script$7 = {
    expose: [],
    props: {
      table_buttons: Array,
      columns_config: Array,
      data_url: String,
      enable_search: Boolean,
  },
    setup(__props) {

  const props = __props;


  const table_id = ref(null);
  // let _this = getCurrentInstance().ctx;

  let table = null;
  onMounted(() => {
      /* Create a datatable with the buttons */
      let config = DataTableUtils.getStdDatatableConfig(props.table_buttons);
      config = DataTableUtils.extendConfig(config, {
          serverSide: false,
  	destroy: true,
          searching: props.enable_search,
  	order: [[0, "asc"]],
          pagingType: 'full_numbers',
  	columnDefs: {},
  	ajax: {
  	    method: 'get',
  	    url: props.data_url,
  	    dataSrc: 'rsp',
              beforeSend: function() {
                  NtopUtils.showOverlays();
              },
              complete: function() {
                NtopUtils.hideOverlays();
              }
          },
          columns: props.columns_config,
      });
      table = $(table_id.value).DataTable(config);
  });

  //onUpdated(() => { console.log("Updated"); });

  const reload = () => {
      if (table == null) { return; }
      table.ajax.url(props.data_url).load();
  };

  const delete_button_handlers = (handlerId) => {
      DataTableUtils.deleteButtonHandlers(handlerId);
  };

  let is_destroyed = false;

  const destroy_table = () => {
      table.clear();
      table.destroy(true);
      is_destroyed = true;
  };

  defineExpose({ reload, delete_button_handlers, destroy_table });

  onBeforeUnmount(() => {
      if (is_destroyed == true) { return; }
      table.destroy(true);
  });


  return (_ctx, _cache) => {
    return (openBlock(), createBlock("div", null, [
      createVNode("table", {
        ref: table_id,
        class: "table w-100 table-striped table-hover table-bordered mt-3"
      }, [
        createVNode("thead", null, [
          createVNode("tr", null, [
            (openBlock(true), createBlock(Fragment, null, renderList(__props.columns_config, (item) => {
              return (openBlock(), createBlock("th", null, toDisplayString(item.columnName), 1 /* TEXT */))
            }), 256 /* UNKEYED_FRAGMENT */))
          ])
        ]),
        _hoisted_1$6
      ], 512 /* NEED_PATCH */)
    ]))
  }
  }

  };

  function styleInject(css, ref) {
    if ( ref === void 0 ) ref = {};
    var insertAt = ref.insertAt;

    if (!css || typeof document === 'undefined') { return; }

    var head = document.head || document.getElementsByTagName('head')[0];
    var style = document.createElement('style');
    style.type = 'text/css';

    if (insertAt === 'top') {
      if (head.firstChild) {
        head.insertBefore(style, head.firstChild);
      } else {
        head.appendChild(style);
      }
    } else {
      head.appendChild(style);
    }

    if (style.styleSheet) {
      style.styleSheet.cssText = css;
    } else {
      style.appendChild(document.createTextNode(css));
    }
  }

  var css_248z$6 = "\n";
  styleInject(css_248z$6);

  script$7.__scopeId = "data-v-6e68bac7";
  script$7.__file = "http_src/vue/datatable.vue";

  var script$6 = {
      components: {
      },
      props: {
  	id: String,
      },
      emits: ["epoch_change"],
      /** This method is the first method of the component called, it's called before html template creation. */
      created() {	
      },
      /** This method is the first method called after html template creation. */
      mounted() {
  	let epoch_begin = ntopng_url_manager.get_url_entry("epoch_begin");
  	let epoch_end = ntopng_url_manager.get_url_entry("epoch_end");
  	if (epoch_begin != null && epoch_end != null) {
  	    // update the status
  	    
              ntopng_events_manager.emit_event(ntopng_events.EPOCH_CHANGE, { epoch_begin: Number.parseInt(epoch_begin), epoch_end: Number.parseInt(epoch_end) }, this.$props.id);
  	}
  	let me = this;
  	let f_set_picker = (picker, var_name) => {
  	    return flatpickr($(this.$refs[picker]), {
  		enableTime: true,
  		dateFormat: "d/m/Y H:i",
  		//altInput: true,
  		//dateFormat: "YYYY-MM-DD HH:mm",
  		//altFormat: "d-m-Y H:i",
  		//locale: "it",
  		time_24hr: true,
  		clickOpens: true,		
  		//mode: "range",
  		//static: true,
  		onChange: function(selectedDates, dateStr, instance) {
            me.enable_apply = true;
            me.wrong_date = me.flat_begin_date.selectedDates[0].getTime() > me.flat_end_date.selectedDates[0].getTime();
            //me.a[data] = d;
        },
      });
  	};
  	this.flat_begin_date = f_set_picker("begin-date");
  	this.flat_end_date = f_set_picker("end-date");
          ntopng_events_manager.on_event_change(this.$props.id, ntopng_events.EPOCH_CHANGE, (new_status) => this.on_status_updated(new_status), true);
  	// notifies that component is ready
  	//console.log(this.$props["id"]);
  	ntopng_sync.ready(this.$props["id"]);
      },
      
      /** Methods of the component. */
      methods: {
  	utc_s_to_server_date: function(utc_seconds) {
  	    let utc = utc_seconds * 1000;
  	    let d_local = new Date(utc);
  	    let local_offset = d_local.getTimezoneOffset();
  	    let server_offset = moment.tz(utc, ntop_zoneinfo)._offset;
  	    let offset_minutes =  server_offset + local_offset;
  	    let offset_ms = offset_minutes * 1000 * 60;
  	    var d_server = new Date(utc + offset_ms);
  	    return d_server;
  	},
  	server_date_to_date: function(date, format) {
  	    let utc = date.getTime();
  	    let local_offset = date.getTimezoneOffset();
  	    let server_offset = moment.tz(utc, ntop_zoneinfo)._offset;
  	    let offset_minutes =  server_offset + local_offset;
  	    let offset_ms = offset_minutes * 1000 * 60;
  	    var d_local = new Date(utc - offset_ms);
  	    return d_local;
  	},
          on_status_updated: function(status) {
              let end_date_time_utc = Date.now();        
              // default begin date time now - 30 minutes
              let begin_date_time_utc = end_date_time_utc - 30 * 60 * 1000;
              if (status.epoch_end != null && status.epoch_begin != null
  		&& Number.parseInt(status.epoch_end) > Number.parseInt(status.epoch_begin)) {
  		status.epoch_begin = Number.parseInt(status.epoch_begin);
  		status.epoch_end = Number.parseInt(status.epoch_end);
                  end_date_time_utc = status.epoch_end * 1000;
                  begin_date_time_utc = status.epoch_begin * 1000;
              } else {
                  status.epoch_end = this.get_utc_seconds(end_date_time_utc);
                  status.epoch_begin = this.get_utc_seconds(begin_date_time_utc);
                  this.emit_epoch_change(status, this.$props.id);
              }
  	    // this.flat_begin_date.setDate(new Date(status.epoch_begin * 1000));
  	    // this.flat_end_date.setDate(new Date(status.epoch_end * 1000));
  	    this.flat_begin_date.setDate(this.utc_s_to_server_date(status.epoch_begin));
  	    this.flat_end_date.setDate(this.utc_s_to_server_date(status.epoch_end));
              // this.set_date_time("begin-date", begin_date_time_utc, false);
              // this.set_date_time("begin-time", begin_date_time_utc, true);
              // this.set_date_time("end-date", end_date_time_utc, false);
              // this.set_date_time("end-time", end_date_time_utc, true);
              this.set_select_time_value(begin_date_time_utc, end_date_time_utc);
              this.epoch_status = status;
              this.enable_apply = false;
  	    ntopng_url_manager.add_obj_to_url({epoch_begin: status.epoch_begin, epoch_end: status.epoch_end});
          },
          set_select_time_value: function(begin_utc, end_utc) {
              let s_values = this.get_select_values();
              const tolerance = 60;
              const now = this.get_utc_seconds(Date.now());
              const end_utc_s = this.get_utc_seconds(end_utc);
              const begin_utc_s = this.get_utc_seconds(begin_utc);
              
              if (this.is_between(end_utc_s, now, tolerance)) {
                  if (this.is_between(begin_utc_s, now - s_values.min_5, tolerance)) {
                      this.select_time_value = "min_5";
                  } else if (this.is_between(begin_utc_s, now - s_values.min_30, tolerance)) {
                      this.select_time_value = "min_30";
                  } else if (this.is_between(begin_utc_s, now - s_values.hour, tolerance)) {
                      this.select_time_value = "hour";
                  } else if (this.is_between(begin_utc_s, now - s_values.day, tolerance)) {
                      this.select_time_value = "day";
                  } else if (this.is_between(begin_utc_s, now - s_values.week, tolerance)) {
                      this.select_time_value = "week";
                  } else if (this.is_between(begin_utc_s, now - s_values.month, tolerance)) {
                      this.select_time_value = "month";
                  } else if (this.is_between(begin_utc_s, now - s_values.year, tolerance)) {
                      this.select_time_value = "year";
                  } else {
                      this.select_time_value = "custom";
                  }
              } else {
                  this.select_time_value = "custom";
              }
              
          },
          apply: function() {
              // let date_begin = this.$refs["begin-date"].valueAsDate;
              // let d_time_begin = this.$refs["begin-time"].valueAsDate;
              // date_begin.setHours(d_time_begin.getHours());
              // date_begin.setMinutes(d_time_begin.getMinutes() + d_time_begin.getTimezoneOffset());
              // date_begin.setSeconds(d_time_begin.getSeconds());
              
              // let date_end = this.$refs["end-date"].valueAsDate;
              // let d_time_end = this.$refs["end-time"].valueAsDate;
              // date_end.setHours(d_time_end.getHours());
              // date_end.setMinutes(d_time_end.getMinutes() + d_time_end.getTimezoneOffset());
              // date_end.setSeconds(d_time_end.getSeconds());
              // let epoch_begin = this.get_utc_seconds(date_begin.valueOf());
              // let epoch_end = this.get_utc_seconds(date_end.valueOf());
  	    let now_s = this.get_utc_seconds(Date.now());
  	    let begin_date = this.server_date_to_date(this.flat_begin_date.selectedDates[0]);
  	    let epoch_begin = this.get_utc_seconds(begin_date.getTime());
  	    let end_date = this.server_date_to_date(this.flat_end_date.selectedDates[0]);
  	    let epoch_end = this.get_utc_seconds(end_date.getTime());
  	    if (epoch_end > now_s) {
  		epoch_end = now_s;
  	    }
              let status = { epoch_begin , epoch_end };
              this.emit_epoch_change(status);
          },
          // set_date_time: function(ref_name, utc_ts, is_time) {
          //     utc_ts = this.get_utc_seconds(utc_ts) * 1000;        
          //     let date_time = new Date(utc_ts);
          //     date_time.setMinutes(date_time.getMinutes() - date_time.getTimezoneOffset());
  	//     if (is_time) {
  	// 	this.$refs[ref_name].value = date_time.toISOString().substring(11,16);
  	//     } else {
  	// 	this.$refs[ref_name].value = date_time.toISOString().substring(0,10);
  	//     }
          // },
          change_select_time: function() {
              let s_values = this.get_select_values();
              let interval_s = s_values[this.select_time_value];
              let epoch_end = this.get_utc_seconds(Date.now());
              let epoch_begin = epoch_end - interval_s;
              let status = { epoch_begin: epoch_begin, epoch_end: epoch_end };
              this.emit_epoch_change(status);
          },
          get_select_values: function() {
              let min = 60;
              return {
                  min_5: min * 5,
                  min_30: min * 30,
                  hour: min * 60,
                  day: this.get_last_day_seconds(), 
                  week: this.get_last_week_seconds(), 
                  month: this.get_last_month_seconds(), 
                  year: this.get_last_year_seconds(),
              };
          },
          get_utc_seconds: function(utc_ts) {
              return Number.parseInt(utc_ts / 1000);
          },
          is_between: function(x, y, tolerance) {
              return x >= y - tolerance && x <= y;
          },
          get_last_day_seconds: function() {
              let t = new Date();
              return this.get_utc_seconds(Date.now() - t.setDate(t.getDate() - 1));
          },
          get_last_week_seconds: function() {
              let t = new Date();
              return this.get_utc_seconds(Date.now() - t.setDate(t.getDate() - 7));
          },
          get_last_month_seconds: function() {
              let t = new Date();
              return this.get_utc_seconds(Date.now() - t.setMonth(t.getMonth() - 1));
          },
          get_last_year_seconds: function() {
              let t = new Date();
              return this.get_utc_seconds(Date.now() - t.setMonth(t.getMonth() - 12));
          },
          zoom: function(scale) {
              if (this.epoch_status == null) { return; }
              let interval = (this.epoch_status.epoch_end - this.epoch_status.epoch_begin) / scale;
              let center = (this.epoch_status.epoch_end / 2 + this.epoch_status.epoch_begin / 2);
              this.epoch_status.epoch_begin = center - interval / 2;
              this.epoch_status.epoch_end = center + interval / 2;
              let now = this.get_utc_seconds(Date.now());
              if (this.epoch_status.epoch_end > now) {
                  this.epoch_status.epoch_end = now;
              }
              this.epoch_status.epoch_end = Number.parseInt(this.epoch_status.epoch_end);
              this.epoch_status.epoch_begin = Number.parseInt(this.epoch_status.epoch_begin);
              if (this.epoch_status.epoch_begin == this.epoch_status.epoch_end) {
                  this.epoch_status.epoch_begin -= 2;
              }
              this.emit_epoch_change(this.epoch_status);
          },
          jump_time_back: function() {
              if (this.epoch_status == null) { return; }
              const min = 60;
              this.epoch_status.epoch_begin -= (30 * min);
              this.epoch_status.epoch_end -= (30 * min);
              this.emit_epoch_change(this.epoch_status);
          },
          jump_time_ahead: function() {
              if (this.epoch_status == null) { return; }
              const min = 60;
              let previous_end = this.epoch_status.epoch_end;
              let now = this.get_utc_seconds(Date.now());
              
              this.epoch_status.epoch_end += (30 * min);
              if (this.epoch_status.epoch_end > now) {
                  this.epoch_status.epoch_end = now;
              }
              this.epoch_status.epoch_begin += (this.epoch_status.epoch_end - previous_end);
              this.emit_epoch_change(this.epoch_status);
          },
          emit_epoch_change: function(epoch_status, id) {
              if (epoch_status.epoch_end == null || epoch_status.epoch_begin == null) { return; }            this.wrong_date = false;
              if (epoch_status.epoch_begin > epoch_status.epoch_end) {
                  this.wrong_date = true;
  		return;
              }
              this.$emit("epoch_change", epoch_status);
              ntopng_events_manager.emit_event(ntopng_events.EPOCH_CHANGE, epoch_status, id);
          },
          change_begin_date: function() {
          },
      },
      /**
         Private date of vue component.
      */
      data() {
          return {
  	    i18n: (t) => i18n(t),
              //status_id: "data-time-range-picker" + this.$props.id,
              epoch_status: null,
              enable_apply: false,
              select_time_value: "min_5",
              wrong_date: false,
  	    flat_begin_date: null,
  	    flat_end_date: null,
          };
      },
  };

  const _withId$5 = /*#__PURE__*/withScopeId();

  pushScopeId("data-v-bc6f1430");
  const _hoisted_1$5 = { class: "input-group mx-1" };
  const _hoisted_2$5 = { class: "form-group" };
  const _hoisted_3$5 = { class: "controls d-flex flex-wrap" };
  const _hoisted_4$5 = { class: "btn-group me-auto btn-group-sm" };
  const _hoisted_5$5 = { value: "min_5" };
  const _hoisted_6$5 = { value: "min_30" };
  const _hoisted_7$5 = { value: "hour" };
  const _hoisted_8$4 = { value: "day" };
  const _hoisted_9$4 = { value: "week" };
  const _hoisted_10$4 = { value: "month" };
  const _hoisted_11$4 = { value: "year" };
  const _hoisted_12$3 = { value: "custom" };
  const _hoisted_13$2 = { class: "btn-group" };
  const _hoisted_14$2 = /*#__PURE__*/createVNode("span", { class: "input-group-text" }, [
    /*#__PURE__*/createVNode("i", { class: "fas fa-calendar-alt" })
  ], -1 /* HOISTED */);
  const _hoisted_15$2 = {
    class: "flatpickr flatpickr-input",
    type: "text",
    placeholder: "Choose a date..",
    "data-id": "datetime",
    ref: "begin-date"
  };
  const _hoisted_16$2 = /*#__PURE__*/createVNode("span", { class: "input-group-text" }, [
    /*#__PURE__*/createVNode("i", { class: "fas fa-long-arrow-alt-right" })
  ], -1 /* HOISTED */);
  const _hoisted_17$2 = {
    class: "flatpickr flatpickr-input",
    type: "text",
    placeholder: "Choose a date..",
    "data-id": "datetime",
    ref: "end-date"
  };
  const _hoisted_18$2 = /*#__PURE__*/createVNode("i", { class: "fas fa-exclamation-circle" }, null, -1 /* HOISTED */);
  const _hoisted_19$1 = { class: "d-flex align-items-center ms-2" };
  const _hoisted_20$1 = { class: "btn-group" };
  const _hoisted_21$1 = /*#__PURE__*/createVNode("i", { class: "fas fa-long-arrow-alt-left" }, null, -1 /* HOISTED */);
  const _hoisted_22$1 = /*#__PURE__*/createVNode("i", { class: "fas fa-long-arrow-alt-right" }, null, -1 /* HOISTED */);
  const _hoisted_23$1 = /*#__PURE__*/createVNode("i", { class: "fas fa-search-plus" }, null, -1 /* HOISTED */);
  const _hoisted_24$1 = /*#__PURE__*/createVNode("i", { class: "fas fa-search-minus" }, null, -1 /* HOISTED */);
  popScopeId();

  const render$4 = /*#__PURE__*/_withId$5((_ctx, _cache, $props, $setup, $data, $options) => {
    return (openBlock(), createBlock("div", _hoisted_1$5, [
      createVNode("div", _hoisted_2$5, [
        createVNode("div", _hoisted_3$5, [
          createVNode("div", _hoisted_4$5, [
            renderSlot(_ctx.$slots, "begin"),
            withDirectives(createVNode("select", {
              "onUpdate:modelValue": _cache[1] || (_cache[1] = $event => ($data.select_time_value = $event)),
              onChange: _cache[2] || (_cache[2] = (...args) => ($options.change_select_time && $options.change_select_time(...args))),
              class: "form-select me-2"
            }, [
              createCommentVNode(" <option value=\"min_5\">{{context.text.show_alerts_presets[\"5_min\"]}}</option> "),
              createVNode("option", _hoisted_5$5, toDisplayString($data.i18n('show_alerts.presets.5_min')), 1 /* TEXT */),
              createVNode("option", _hoisted_6$5, toDisplayString($data.i18n('show_alerts.presets.30_min')), 1 /* TEXT */),
              createVNode("option", _hoisted_7$5, toDisplayString($data.i18n('show_alerts.presets.hour')), 1 /* TEXT */),
              createVNode("option", _hoisted_8$4, toDisplayString($data.i18n('show_alerts.presets.day')), 1 /* TEXT */),
              createVNode("option", _hoisted_9$4, toDisplayString($data.i18n('show_alerts.presets.week')), 1 /* TEXT */),
              createVNode("option", _hoisted_10$4, toDisplayString($data.i18n('show_alerts.presets.month')), 1 /* TEXT */),
              createVNode("option", _hoisted_11$4, toDisplayString($data.i18n('show_alerts.presets.year')), 1 /* TEXT */),
              createVNode("option", _hoisted_12$3, toDisplayString($data.i18n('graphs.custom')), 1 /* TEXT */)
            ], 544 /* HYDRATE_EVENTS, NEED_PATCH */), [
              [vModelSelect, $data.select_time_value]
            ]),
            createVNode("div", _hoisted_13$2, [
              _hoisted_14$2,
              createVNode("input", _hoisted_15$2, null, 512 /* NEED_PATCH */),
              createCommentVNode(" <input ref=\"begin-date\" @change=\"enable_apply=true\" @change=\"change_begin_date\" type=\"date\" class=\"date_time_input begin-timepicker form-control border-right-0 fix-safari-input\"> "),
              createCommentVNode(" <input ref=\"begin-time\" @change=\"enable_apply=true\" type=\"time\" class=\"date_time_input begin-timepicker form-control border-right-0 fix-safari-input\"> "),
              _hoisted_16$2,
              createVNode("input", _hoisted_17$2, null, 512 /* NEED_PATCH */),
              createCommentVNode(" <input ref=\"end-date\" @change=\"enable_apply=true\" type=\"date\" class=\"date_time_input end-timepicker form-control border-left-0 fix-safari-input\" style=\"width: 2.5rem;\"> "),
              createCommentVNode(" <input ref=\"end-time\" @change=\"enable_apply=true\" type=\"time\" class=\"date_time_input end-timepicker form-control border-left-0 fix-safari-input\"> "),
              withDirectives(createVNode("span", {
                title: $data.i18n('wrong_date_range'),
                style: {"margin-left":"0.2rem","color":"red"}
              }, [
                _hoisted_18$2
              ], 8 /* PROPS */, ["title"]), [
                [vShow, $data.wrong_date]
              ])
            ]),
            createVNode("div", _hoisted_19$1, [
              createVNode("button", {
                disabled: !$data.enable_apply || $data.wrong_date,
                onClick: _cache[3] || (_cache[3] = (...args) => ($options.apply && $options.apply(...args))),
                class: "btn btn-sm btn-primary"
              }, toDisplayString($data.i18n('apply')), 9 /* TEXT, PROPS */, ["disabled"]),
              createVNode("div", _hoisted_20$1, [
                createVNode("button", {
                  onClick: _cache[4] || (_cache[4] = $event => ($options.jump_time_back())),
                  class: "btn btn-sm btn-link",
                  ref: "btn-jump-time-back"
                }, [
                  _hoisted_21$1
                ], 512 /* NEED_PATCH */),
                createVNode("button", {
                  onClick: _cache[5] || (_cache[5] = $event => ($options.jump_time_ahead())),
                  class: "btn btn-sm btn-link me-2",
                  ref: "btn-jump-time-ahead"
                }, [
                  _hoisted_22$1
                ], 512 /* NEED_PATCH */),
                createVNode("button", {
                  onClick: _cache[6] || (_cache[6] = $event => ($options.zoom(2))),
                  class: "btn btn-sm btn-link",
                  ref: "btn-zoom-in"
                }, [
                  _hoisted_23$1
                ], 512 /* NEED_PATCH */),
                createVNode("button", {
                  onClick: _cache[7] || (_cache[7] = $event => ($options.zoom(0.5))),
                  class: "btn btn-sm btn-link",
                  ref: "btn-zoom-out"
                }, [
                  _hoisted_24$1
                ], 512 /* NEED_PATCH */),
                renderSlot(_ctx.$slots, "extra_buttons")
              ])
            ])
          ])
        ])
      ])
    ]))
  });

  var css_248z$5 = "\n.date_time_input[data-v-bc6f1430] {\n  width: 10.5rem;\n  max-width: 10.5rem;\n  min-width: 10.5rem;\n}\n";
  styleInject(css_248z$5);

  script$6.render = render$4;
  script$6.__scopeId = "data-v-bc6f1430";
  script$6.__file = "http_src/vue/data-time-range-picker.vue";

  const _withId$4 = /*#__PURE__*/withScopeId();


  var script$5 = {
    expose: [],
    props: {
      body: String,
      title: String,
  },
    setup(__props) {
  const modal_id = ref(null);
  const emit = defineEmits(['delete']);

  const showed = () => {};



  const show = () => {
      modal_id.value.show();
  };

  const delete_ = () => {
      close();
  };

  const close = () => {
      emit('delete');
      modal_id.value.close();
  };


  defineExpose({ show, close });

  onMounted(() => {
  });

  const _i18n = (t) => i18n(t);


  return (_ctx, _cache) => {
    return (openBlock(), createBlock(script$8, {
      onShowed: _cache[1] || (_cache[1] = $event => (showed())),
      ref: modal_id
    }, {
      title: _withId$4(() => [
        createTextVNode(toDisplayString(__props.title), 1 /* TEXT */)
      ]),
      body: _withId$4(() => [
        createTextVNode(toDisplayString(__props.body), 1 /* TEXT */)
      ]),
      footer: _withId$4(() => [
        createVNode("button", {
          type: "button",
          onClick: delete_,
          class: "btn btn-danger"
        }, toDisplayString(_i18n('delete')), 1 /* TEXT */)
      ]),
      _: 1 /* STABLE */
    }, 512 /* NEED_PATCH */))
  }
  }

  };

  var css_248z$4 = "\n";
  styleInject(css_248z$4);

  script$5.__scopeId = "data-v-13e26aab";
  script$5.__file = "http_src/vue/modal-delete-confirm.vue";

  const _withId$3 = /*#__PURE__*/withScopeId();

  pushScopeId("data-v-7e5acce0");
  const _hoisted_1$4 = { class: "mb-3 row" };
  const _hoisted_2$4 = { class: "col-form-label col-sm-4" };
  const _hoisted_3$4 = { class: "col-sm-6" };
  const _hoisted_4$4 = {
    class: "btn-group btn-group-toggle",
    "data-bs-toggle": "buttons"
  };
  const _hoisted_5$4 = /*#__PURE__*/createVNode("hr", null, null, -1 /* HOISTED */);
  const _hoisted_6$4 = { class: "host-alert-fields" };
  const _hoisted_7$4 = { class: "mb-3 row" };
  const _hoisted_8$3 = { class: "col-form-label col-sm-4" };
  const _hoisted_9$3 = { class: "col-sm-6" };
  const _hoisted_10$3 = { value: "" };
  const _hoisted_11$3 = { value: "0" };
  const _hoisted_12$2 = { disabled: "" };
  const _hoisted_13$1 = { class: "flow-alert-fields" };
  const _hoisted_14$1 = { class: "mb-3 row" };
  const _hoisted_15$1 = { class: "col-form-label col-sm-4" };
  const _hoisted_16$1 = { class: "col-sm-6" };
  const _hoisted_17$1 = { value: "" };
  const _hoisted_18$1 = { value: "0" };
  const _hoisted_19 = { disabled: "" };
  const _hoisted_20 = {
    key: 0,
    class: "ip-fields"
  };
  const _hoisted_21 = { class: "mb-3 row" };
  const _hoisted_22 = { class: "col-form-label col-sm-4" };
  const _hoisted_23 = { class: "col-sm-6" };
  const _hoisted_24 = {
    key: 1,
    class: "network-fields"
  };
  const _hoisted_25 = { class: "mb-3 row" };
  const _hoisted_26 = { class: "col-form-label col-sm-4" };
  const _hoisted_27 = { class: "col-sm-4 pr-0" };
  const _hoisted_28 = { class: "col-sm-2 pl-0 pe-0" };
  const _hoisted_29 = /*#__PURE__*/createVNode("span", { class: "me-2" }, "/", -1 /* HOISTED */);
  const _hoisted_30 = { class: "mb-3 row" };
  const _hoisted_31 = { class: "col-form-label col-sm-4" };
  const _hoisted_32 = { key: 0 };
  const _hoisted_33 = { key: 1 };
  const _hoisted_34 = { class: "col-sm-6" };
  popScopeId();


  var script$4 = {
    expose: [],
    props: {
      alert_exclusions_page: String,
      host_alert_types: Array,
      flow_alert_types: Array,    
  },
    setup(__props) {

  const props = __props;
  const modal_id = ref(null);
  const exclude_type = ref("ip");
  const input_ip = ref("");
  const input_network = ref("");
  const input_text = ref("");
  const host_selected = ref("");
  const flow_selected = ref("");
  const netmask = ref("");

  const emit = defineEmits(['add']);

  function get_data_pattern(value_type) {
      if (value_type == "text") {
  	return `.*`;
      } else if (value_type == "ip") {
  	let r_ipv4 = NtopUtils.REGEXES.ipv4;
  	let r_ipv4_vlan = r_ipv4.replace("$", "@[0-9]{0,5}$");
  	let r_ipv6 = NtopUtils.REGEXES.ipv6;
  	let r_ipv6_vlan = r_ipv6.replaceAll("$", "@[0-9]{0,5}$");
  	return `(${r_ipv4})|(${r_ipv4_vlan})|(${r_ipv6})|(${r_ipv6_vlan})`;
      } else if (value_type == "hostname") {
  	return `${NtopUtils.REGEXES.singleword}|[a-zA-Z0-9._\-]{3,250}@[0-9]{0,5}$`;
      }
      return NtopUtils.REGEXES[value_type];
  }
  let pattern_ip = get_data_pattern("ip");
  let pattern_text = get_data_pattern("text");

  const set_exclude_type = (type) => {
      exclude_type.value = type;
  };

  const check_disable_apply = () => {
      let regex = new RegExp(pattern_ip);
      let disable_apply = true;
      if (props.alert_exclusions_page != 'hosts') {
  	disable_apply = (input_text.value == null || input_text.value == "") || (regex.test(input_text.value));
  	return disable_apply;
      }
      if (exclude_type.value == "ip") {
  	disable_apply = (input_ip.value == null || input_ip.value == "") || (regex.test(input_ip.value) == false) || (host_selected.value == "" && flow_selected.value == "");
      } else {
  	disable_apply = (input_network.value == null || input_network.value == "")
  	    || (regex.test(input_network.value) == false)
  	    || (host_selected.value == "" && flow_selected.value == "")
  	    || (netmask.value == null || netmask.value == "" || parseInt(netmask.value) < 1 || parseInt(netmask.value) > 127);
      }
      return disable_apply;
  };

  const showed = () => {};

  const show = () => {
      exclude_type.value = "ip";
      input_ip.value = "";
      input_network.value = "";
      host_selected.value = "";
      flow_selected.value = "";
      netmask.value = "";
      input_text.value = "";
      modal_id.value.show();
  };

  const close = () => {
      modal_id.value.close();
  };

  const add = () => {
      let params;
      let alert_addr = input_ip.value;
      if (props.alert_exclusions_page == "hosts") {
  	if (exclude_type.value == "network") {
  	    alert_addr = `${alert_addr}/${netmask.value}`;
  	}
  	params = { alert_addr, host_alert_key: host_selected.value, flow_alert_key: flow_selected.value };
      } else if (props.alert_exclusions_page == "domain_names") {
  	params = { alert_domain: input_text.value };
      } else if (props.alert_exclusions_page == "tls_certificate") {
  	params = { alert_certificate: input_text.value };
      }
      emit('add', params);
      close();
  };

  defineExpose({ show, close });

  onMounted(() => {
  });

  const _i18n = (t) => i18n(t);


  return (_ctx, _cache) => {
    return (openBlock(), createBlock(script$8, {
      onShowed: _cache[9] || (_cache[9] = $event => (showed())),
      ref: modal_id
    }, {
      title: _withId$3(() => [
        createTextVNode(toDisplayString(_i18n("check_exclusion.add_exclusion")), 1 /* TEXT */)
      ]),
      body: _withId$3(() => [
        (__props.alert_exclusions_page == 'hosts')
          ? (openBlock(), createBlock(Fragment, { key: 0 }, [
              createCommentVNode(" modal hosts "),
              createVNode("div", _hoisted_1$4, [
                createVNode("label", _hoisted_2$4, [
                  createVNode("b", null, toDisplayString(_i18n("check_exclusion.member_type")), 1 /* TEXT */)
                ]),
                createVNode("div", _hoisted_3$4, [
                  createVNode("div", _hoisted_4$4, [
                    createVNode("label", {
                      class: [{'active': exclude_type.value == 'ip'}, "btn btn-secondary"]
                    }, [
                      createVNode("input", {
                        class: "btn-check",
                        type: "radio",
                        name: "member_type",
                        value: "ip",
                        onClick: _cache[1] || (_cache[1] = $event => (set_exclude_type('ip')))
                      }),
                      createTextVNode(" " + toDisplayString(_i18n("check_exclusion.ip_address")), 1 /* TEXT */)
                    ], 2 /* CLASS */),
                    createVNode("label", {
                      class: [{'active': exclude_type.value == 'network'}, "btn btn-secondary"]
                    }, [
                      createVNode("input", {
                        onClick: _cache[2] || (_cache[2] = $event => (set_exclude_type('network'))),
                        class: "btn-check",
                        type: "radio",
                        name: "member_type",
                        value: "network"
                      }),
                      createTextVNode(" " + toDisplayString(_i18n("check_exclusion.network")), 1 /* TEXT */)
                    ], 2 /* CLASS */)
                  ])
                ])
              ]),
              _hoisted_5$4,
              createVNode("div", _hoisted_6$4, [
                createVNode("div", _hoisted_7$4, [
                  createVNode("label", _hoisted_8$3, [
                    createVNode("b", null, toDisplayString(_i18n("check_exclusion.host_alert_type")), 1 /* TEXT */)
                  ]),
                  createVNode("div", _hoisted_9$3, [
                    withDirectives(createVNode("select", {
                      name: "value",
                      class: "form-select alert-select",
                      "onUpdate:modelValue": _cache[3] || (_cache[3] = $event => (host_selected.value = $event))
                    }, [
                      createVNode("option", _hoisted_10$3, toDisplayString(_i18n("check_exclusion.none")), 1 /* TEXT */),
                      createVNode("option", _hoisted_11$3, toDisplayString(_i18n("check_exclusion.exclude_all_alerts")), 1 /* TEXT */),
                      createVNode("option", _hoisted_12$2, toDisplayString(_i18n("check_exclusion.spacing_bar")), 1 /* TEXT */),
                      (openBlock(true), createBlock(Fragment, null, renderList(__props.host_alert_types, (item) => {
                        return (openBlock(), createBlock(Fragment, null, [
                          (item != null)
                            ? (openBlock(), createBlock("option", {
                                key: 0,
                                value: item.alert_id
                              }, toDisplayString(item.label), 9 /* TEXT, PROPS */, ["value"]))
                            : createCommentVNode("v-if", true)
                        ], 64 /* STABLE_FRAGMENT */))
                      }), 256 /* UNKEYED_FRAGMENT */))
                    ], 512 /* NEED_PATCH */), [
                      [vModelSelect, host_selected.value]
                    ])
                  ])
                ])
              ]),
              createVNode("div", _hoisted_13$1, [
                createVNode("div", _hoisted_14$1, [
                  createVNode("label", _hoisted_15$1, [
                    createVNode("b", null, toDisplayString(_i18n("check_exclusion.flow_alert_type")), 1 /* TEXT */)
                  ]),
                  createVNode("div", _hoisted_16$1, [
                    withDirectives(createVNode("select", {
                      id: "flow-alert-select",
                      name: "value",
                      class: "form-select alert-select",
                      "onUpdate:modelValue": _cache[4] || (_cache[4] = $event => (flow_selected.value = $event))
                    }, [
                      createVNode("option", _hoisted_17$1, toDisplayString(_i18n("check_exclusion.none")), 1 /* TEXT */),
                      createVNode("option", _hoisted_18$1, toDisplayString(_i18n("check_exclusion.exclude_all_alerts")), 1 /* TEXT */),
                      createVNode("option", _hoisted_19, toDisplayString(_i18n("check_exclusion.spacing_bar")), 1 /* TEXT */),
                      (openBlock(true), createBlock(Fragment, null, renderList(__props.flow_alert_types, (item) => {
                        return (openBlock(), createBlock(Fragment, null, [
                          (item != null)
                            ? (openBlock(), createBlock("option", {
                                key: 0,
                                value: item.alert_id
                              }, toDisplayString(item.label), 9 /* TEXT, PROPS */, ["value"]))
                            : createCommentVNode("v-if", true)
                        ], 64 /* STABLE_FRAGMENT */))
                      }), 256 /* UNKEYED_FRAGMENT */))
                    ], 512 /* NEED_PATCH */), [
                      [vModelSelect, flow_selected.value]
                    ])
                  ])
                ])
              ]),
              (exclude_type.value == 'ip')
                ? (openBlock(), createBlock("div", _hoisted_20, [
                    createVNode("div", _hoisted_21, [
                      createVNode("label", _hoisted_22, [
                        createVNode("b", null, toDisplayString(_i18n("check_exclusion.ip_address")), 1 /* TEXT */)
                      ]),
                      createVNode("div", _hoisted_23, [
                        withDirectives(createVNode("input", {
                          pattern: unref(pattern_ip),
                          placeholder: "192.168.1.1",
                          required: "",
                          type: "text",
                          name: "ip_address",
                          class: "form-control",
                          "onUpdate:modelValue": _cache[5] || (_cache[5] = $event => (input_ip.value = $event))
                        }, null, 8 /* PROPS */, ["pattern"]), [
                          [vModelText, input_ip.value]
                        ])
                      ])
                    ])
                  ]))
                : createCommentVNode("v-if", true),
              (exclude_type.value == 'network')
                ? (openBlock(), createBlock("div", _hoisted_24, [
                    createVNode("div", _hoisted_25, [
                      createVNode("label", _hoisted_26, [
                        createVNode("b", null, toDisplayString(_i18n("check_exclusion.network")), 1 /* TEXT */)
                      ]),
                      createVNode("div", _hoisted_27, [
                        withDirectives(createVNode("input", {
                          required: "",
                          style: {"width":"calc(100% - 10px)"},
                          name: "network",
                          class: "form-control d-inline",
                          placeholder: "172.16.0.0",
                          pattern: unref(pattern_ip),
                          "onUpdate:modelValue": _cache[6] || (_cache[6] = $event => (input_network.value = $event))
                        }, null, 8 /* PROPS */, ["pattern"]), [
                          [vModelText, input_network.value]
                        ])
                      ]),
                      createVNode("div", _hoisted_28, [
                        _hoisted_29,
                        withDirectives(createVNode("input", {
                          placeholder: "24",
                          required: "",
                          class: "form-control d-inline w-75",
                          min: "1",
                          max: "127",
                          type: "number",
                          name: "cidr",
                          "onUpdate:modelValue": _cache[7] || (_cache[7] = $event => (netmask.value = $event))
                        }, null, 512 /* NEED_PATCH */), [
                          [vModelText, netmask.value]
                        ])
                      ])
                    ])
                  ]))
                : createCommentVNode("v-if", true)
            ], 64 /* STABLE_FRAGMENT */))
          : createCommentVNode("v-if", true),
        createCommentVNode(" mdoal hosts "),
        (__props.alert_exclusions_page != 'hosts')
          ? (openBlock(), createBlock(Fragment, { key: 1 }, [
              createCommentVNode(" modal domain_names"),
              createVNode("div", null, [
                createVNode("div", _hoisted_30, [
                  createVNode("label", _hoisted_31, [
                    (__props.alert_exclusions_page == 'domain_names')
                      ? (openBlock(), createBlock("b", _hoisted_32, toDisplayString(_i18n("check_exclusion.domain")), 1 /* TEXT */))
                      : createCommentVNode("v-if", true),
                    (__props.alert_exclusions_page == 'tls_certificate')
                      ? (openBlock(), createBlock("b", _hoisted_33, toDisplayString(_i18n("check_exclusion.tls_certificate")), 1 /* TEXT */))
                      : createCommentVNode("v-if", true)
                  ]),
                  createVNode("div", _hoisted_34, [
                    withDirectives(createVNode("input", {
                      placeholder: "",
                      pattern: unref(pattern_text),
                      required: "",
                      type: "text",
                      name: "ip_address",
                      class: "form-control",
                      "onUpdate:modelValue": _cache[8] || (_cache[8] = $event => (input_text.value = $event))
                    }, null, 8 /* PROPS */, ["pattern"]), [
                      [vModelText, input_text.value]
                    ])
                  ])
                ])
              ])
            ], 2112 /* STABLE_FRAGMENT, DEV_ROOT_FRAGMENT */))
          : createCommentVNode("v-if", true),
        createCommentVNode(" modal domain_names")
      ]),
      footer: _withId$3(() => [
        createVNode("button", {
          type: "button",
          disabled: check_disable_apply(),
          onClick: add,
          class: "btn btn-primary"
        }, toDisplayString(_i18n('add')), 9 /* TEXT, PROPS */, ["disabled"])
      ]),
      _: 1 /* STABLE */
    }, 512 /* NEED_PATCH */))
  }
  }

  };

  var css_248z$3 = "\ninput[data-v-7e5acce0]:invalid {\n  border-color: #ff0000;\n}  \n";
  styleInject(css_248z$3);

  script$4.__scopeId = "data-v-7e5acce0";
  script$4.__file = "http_src/vue/modal-add-check-exclusion.vue";

  var script$3 = {
      components: {
  	'modal': script$8,
      }, 
      watch: {
  	"filters_options": function(val, oldVal) {
  	    // if (val == null || val.length == 0) { return; } 
  	    // this.filter_type_selected = val[0].id;
  	    // this.change_filter();
  	}
      },
      props: {
  	id: String,
  	filters_options: Array,
      },
      updated() {
      },
      data() {
  	return {
  	    i18n: (t) => i18n(t),
  	    jQuery: $,
  	    id_modal: `${this.$props.id}_modal`,
  	    filter_type_selected: null,
  	    filter_type_label_selected: null,
  	    operator_selected: null,
  	    option_selected: null,
  	    input_value: null,
  	    data_pattern_selected: null,
  	    input_required: false,
  	    options_to_show: null,
  	    operators_to_show: [],
  	};
      },
      emits: ["apply"],
      created() {
      },
      /** This method is the first method called after html template creation. */
      async mounted() {
  	//$("#select2Input").select2({ dropdownParent: "#modal-container" };
  	await ntopng_sync.on_ready(this.id_modal);
  	ntopng_events_manager.on_custom_event(this.$props["id"], ntopng_custom_events.SHOW_MODAL_FILTERS, (filter) => this.show(filter));	
  	// notifies that component is ready
  	ntopng_sync.ready(this.$props["id"]);
      },
      methods: {
  	show: function(filter) {
  	    if (this.$props.filters_options == null || this.$props.filters_options.length == 0) { return; }
  	    if (filter != null) {
  		this.filter_type_selected = filter.id;
  		let post_change = (filter_def) => {
  		    if (this.option_selected != null) {
  			this.option_selected = filter.value;
  		    } else {
  			this.input_value = filter.value;
  		    }
  		    this.operator_selected = filter.operator;
  		};
  		this.change_filter(post_change);		
  	    }
  	    else {
  		this.filter_type_selected = this.$props.filters_options[0].id;
  		this.change_filter();
  	    }
  	    this.$refs["modal"].show();
  	},
  	change_filter: function(post_change) {
  	    this.options_to_show = null;
  	    this.option_selected = null;
  	    // use setTimeout to fix select2 bugs on first element selected
  	    setTimeout(() => {
  		let filters_options = this.$props.filters_options;
  		let filter = filters_options.find((fo) => fo.id == this.filter_type_selected);
  		if (filter == null) { return; }
  		this.input_value = null;
  		
  		this.filter_type_label_selected = filter.label;
  		this.options_to_show = filter.options;
  		if (filter.options != null) {
  		    this.options_to_show = filter.options.sort((a, b) => {
  			if (a == null || a.label == null) { return -1; }
  			if (b == null || b.label == null) { return 1; }
  			return a.label.toString().localeCompare(b.label.toString());
  		    });
  		}
  		this.operators_to_show = filter.operators;

  		if (filter.operators != null && filter.operators.length > 0) {
  		    filter.operators[0].id;
  		    this.operator_selected = filter.operators[0].id;
  		}
  		else {
  		    this.operator_selected = null;
  		}
  		if (filter.options != null && filter.options.length > 0) {
  		    this.option_selected = filter.options[0].value;
  		}
  		else {
  		    this.option_selected = null;
  		    this.data_pattern_selected = this.get_data_pattern(filter.value_type);
  		}
  		if (post_change != null) { post_change(filter); }
  	    }, 0);
  	},
  	get_data_pattern: function(value_type) {
  	    this.input_required = true;
  	    if (value_type == "text") {
  		this.input_required = false;
  		return `.*`;
  	    } else if (value_type == "ip") {
  		let r_ipv4 = NtopUtils.REGEXES.ipv4;
  		let r_ipv4_vlan = r_ipv4.replace("$", "@[0-9]{0,5}$");
  		let r_ipv6 = NtopUtils.REGEXES.ipv6;
  		let r_ipv6_vlan = r_ipv6.replaceAll("$", "@[0-9]{0,5}$");
  		return `(${r_ipv4})|(${r_ipv4_vlan})|(${r_ipv6})|(${r_ipv6_vlan})`;
  	    }
  	    return NtopUtils.REGEXES[value_type];
  	},
  	check_disable_apply: function() {
  	    let regex = new RegExp(this.data_pattern_selected);
  	    let disable_apply = !this.options_to_show && (
  		(this.input_required && (this.input_value == null || this.input_value == ""))
  		    || (regex.test(this.input_value) == false)
  		);
  	    return disable_apply;
  	},
  	showed: function() {
  	    let me = this;	    // setTimeout(() => {
  	    let select2Div = me.$refs["select2"];
  	    if (!$(select2Div).hasClass("select2-hidden-accessible")) {
  		$(select2Div).select2({
  		    width: '100%',
        theme: 'bootstrap-5',
        dropdownParent: $(select2Div).parent(),
  		});
  		$(select2Div).on('select2:select', function (e) {
  		    let data = e.params.data;
  		    me.option_selected = data.id;
  		});
  	    }
  	},
  	apply: function() {
  	    let value = this.input_value;
  	    let value_label = this.input_value;
  	    if (value == null && this.option_selected != null) {
  		let filter = this.filters_options.find((fo) => fo.id == this.filter_type_selected);
  		let option = filter.options.find((o) => o.value == this.option_selected);
  		value = option.value;
  		value_label = option.value_label;
  	    } else if (value == null) {
  		value = "";
  	    }
  	    let params = {
  		id: this.filter_type_selected,
  		label: this.filter_type_label_selected,
  		operator: this.operator_selected,
  		value: value,
  		value_label: value_label,
  	    };
  	    this.$emit("apply", params);
  	    ntopng_events_manager.emit_custom_event(ntopng_custom_events.MODAL_FILTERS_APPLY, params);
  	    this.close();
  	},
  	close: function() {
  	    this.$refs["modal"].close();
  	},
      },
  };

  const _withId$2 = /*#__PURE__*/withScopeId();

  pushScopeId("data-v-3119c83e");
  const _hoisted_1$3 = { autocomplete: "off" };
  const _hoisted_2$3 = { class: "form-group row" };
  const _hoisted_3$3 = /*#__PURE__*/createVNode("label", {
    class: "col-form-label col-sm-3",
    for: "dt-filter-type-select"
  }, [
    /*#__PURE__*/createVNode("b", null, "Filter")
  ], -1 /* HOISTED */);
  const _hoisted_4$3 = { class: "col-sm-8" };
  const _hoisted_5$3 = /*#__PURE__*/createVNode("input", {
    type: "hidden",
    name: "index"
  }, null, -1 /* HOISTED */);
  const _hoisted_6$3 = /*#__PURE__*/createVNode("hr", null, null, -1 /* HOISTED */);
  const _hoisted_7$3 = { class: "dt-filter-template-container form-group row" };
  const _hoisted_8$2 = { class: "col-form-label col-sm-3" };
  const _hoisted_9$2 = { class: "col-sm-8" };
  const _hoisted_10$2 = { class: "input-group mb-3" };
  const _hoisted_11$2 = { class: "input-group-prepend col-sm-3" };
  const _hoisted_12$1 = { class: "col-sm-9" };
  popScopeId();

  const render$3 = /*#__PURE__*/_withId$2((_ctx, _cache, $props, $setup, $data, $options) => {
    const _component_modal = resolveComponent("modal");

    return (openBlock(), createBlock(_component_modal, {
      id: $data.id_modal,
      onShowed: _cache[7] || (_cache[7] = $event => ($options.showed())),
      ref: "modal"
    }, {
      title: _withId$2(() => [
        createTextVNode(toDisplayString($data.i18n('alerts_dashboard.add_filter')), 1 /* TEXT */)
      ]),
      body: _withId$2(() => [
        createVNode("form", _hoisted_1$3, [
          createVNode("div", _hoisted_2$3, [
            _hoisted_3$3,
            createVNode("div", _hoisted_4$3, [
              _hoisted_5$3,
              withDirectives(createVNode("select", {
                onChange: _cache[1] || (_cache[1] = $event => ($options.change_filter())),
                "onUpdate:modelValue": _cache[2] || (_cache[2] = $event => ($data.filter_type_selected = $event)),
                required: "",
                name: "filter_type",
                class: "form-select"
              }, [
                (openBlock(true), createBlock(Fragment, null, renderList($props.filters_options, (item) => {
                  return (openBlock(), createBlock("option", {
                    value: item.id
                  }, toDisplayString(item.label), 9 /* TEXT, PROPS */, ["value"]))
                }), 256 /* UNKEYED_FRAGMENT */))
              ], 544 /* HYDRATE_EVENTS, NEED_PATCH */), [
                [vModelSelect, $data.filter_type_selected]
              ])
            ])
          ]),
          _hoisted_6$3,
          createVNode("div", _hoisted_7$3, [
            createVNode("label", _hoisted_8$2, [
              createVNode("b", null, toDisplayString($data.filter_type_label_selected), 1 /* TEXT */)
            ]),
            createVNode("div", _hoisted_9$2, [
              createVNode("div", _hoisted_10$2, [
                createVNode("div", _hoisted_11$2, [
                  withDirectives(createVNode("select", {
                    class: "form-select",
                    "onUpdate:modelValue": _cache[3] || (_cache[3] = $event => ($data.operator_selected = $event))
                  }, [
                    (openBlock(true), createBlock(Fragment, null, renderList($data.operators_to_show, (item) => {
                      return (openBlock(), createBlock("option", {
                        value: item.id
                      }, toDisplayString(item.label), 9 /* TEXT, PROPS */, ["value"]))
                    }), 256 /* UNKEYED_FRAGMENT */))
                  ], 512 /* NEED_PATCH */), [
                    [vModelSelect, $data.operator_selected]
                  ])
                ]),
                withDirectives(createVNode("div", _hoisted_12$1, [
                  withDirectives(createVNode("select", {
                    class: "select2 form-select",
                    ref: "select2",
                    required: "",
                    "onUpdate:modelValue": _cache[4] || (_cache[4] = $event => ($data.option_selected = $event)),
                    name: "filter_type"
                  }, [
                    (openBlock(true), createBlock(Fragment, null, renderList($data.options_to_show, (item) => {
                      return (openBlock(), createBlock("option", {
                        value: item.value
                      }, toDisplayString(item.label), 9 /* TEXT, PROPS */, ["value"]))
                    }), 256 /* UNKEYED_FRAGMENT */))
                  ], 512 /* NEED_PATCH */), [
                    [vModelSelect, $data.option_selected]
                  ])
                ], 512 /* NEED_PATCH */), [
                  [vShow, $data.options_to_show]
                ]),
                createCommentVNode(" <div v-show=\"!options_to_show\" class=\"input-group\"> "),
                withDirectives(createVNode("input", {
                  "onUpdate:modelValue": _cache[5] || (_cache[5] = $event => ($data.input_value = $event)),
                  pattern: $data.data_pattern_selected,
                  name: "value",
                  required: $data.input_required,
                  type: "text",
                  class: "form-control"
                }, null, 8 /* PROPS */, ["pattern", "required"]), [
                  [vShow, !$data.options_to_show],
                  [vModelText, $data.input_value]
                ]),
                createCommentVNode(" <span class=\"invalid-feedback\">Invalid value</span> "),
                withDirectives(createVNode("span", {
                  style: {"margin":"0px","padding":"0"},
                  class: "alert invalid-feedback"
                }, toDisplayString($data.i18n('invalid_value')), 513 /* TEXT, NEED_PATCH */), [
                  [vShow, !$data.options_to_show]
                ]),
                createCommentVNode(" </div> ")
              ]),
              createCommentVNode(" end div input-group mb-3 ")
            ]),
            createCommentVNode(" end div form-group-row ")
          ])
        ])
      ]),
      footer: _withId$2(() => [
        createVNode("button", {
          type: "button",
          disabled: $options.check_disable_apply(),
          onClick: _cache[6] || (_cache[6] = (...args) => ($options.apply && $options.apply(...args))),
          class: "btn btn-primary"
        }, toDisplayString($data.i18n('apply')), 9 /* TEXT, PROPS */, ["disabled"])
      ]),
      _: 1 /* STABLE */
    }, 8 /* PROPS */, ["id"]))
  });

  var css_248z$2 = "\ninput ~ .alert[data-v-3119c83e] {\n  display: none;\n}\ninput:invalid ~ .alert[data-v-3119c83e] {\n  display: block;\n}\n";
  styleInject(css_248z$2);

  script$3.render = render$3;
  script$3.__scopeId = "data-v-3119c83e";
  script$3.__file = "http_src/vue/modal-filters.vue";

  var script$2 = defineComponent({
      components: {
  	'modal': script$8,
      },
      props: {
  	id: String,
      },
      updated() {
      },
      data() {
  	return {
  	    description: "",
  	    invalid_bpf: false,
  	    bpf_filter: "",
  	    extract_now: true,
  	    show_menu: true,
  	    i18n: (t) => i18n(t),
  	    id_modal: `${this.$props.id}_modal`,
  	};
      },
      emits: ["apply"],
      created() {
      },
      /** This method is the first method called after html template creation. */
      mounted() {
      },
      methods: {
  	pad2_number: function(number) {
  	    return String(number).padStart(2, '0');
  	},
  	format_date: function(d) {
  	    // let day = this.pad2_number(d.getDate());
  	    // let month = this.pad2_number(d.getMonth());
  	    // let hours = this.pad2_number(d.getHours());
  	    // let minutes = this.pad2_number(d.getMinutes());
  	    // let s = `${day}/${month}/${d.getFullYear()} ${hours}:${minutes}`;
  	    let d_ms = d.valueOf();
  	    return ntopng_utility.from_utc_to_server_date_format(d_ms);
  	},
  	apply: async function() {
  	    if (this.bpf_filter != null && this.bpf_filter != "") {
  		let url_request = `${base_path}/lua/pro/rest/v2/check/filter.lua?query=${this.bpf_filter}`;
  		let res = await ntopng_utility.http_request(url_request, null, false, true);
  		this.invalid_bpf = !res.response;
  		if (this.invalid_bpf == true) {
  		    return;
  		}		
  	    }
  	    let url_request_obj = {
  		ifid: ntopng_url_manager.get_url_entry("ifid"),
  		epoch_begin: ntopng_url_manager.get_url_entry("epoch_begin"),
  		epoch_end: ntopng_url_manager.get_url_entry("epoch_end"),
  		bpf_filter: this.bpf_filter,
  	    };
  	    let url_request_params = ntopng_url_manager.obj_to_url_params(url_request_obj);
  	    if (this.extract_now == true) {
  		
  		let url_request = `${base_path}/lua/rest/v2/get/pcap/live_extraction.lua?${url_request_params}`;
  		window.open(url_request, '_self', false);
  	    } else {
  		let url_request = `${base_path}/lua/traffic_extraction.lua?${url_request_params}`;
  		let resp = await ntopng_utility.http_request(url_request, null, false, true);
  		let job_id = resp.id;
  		//let job_id = 2;
  		let alert_text_html = i18n('traffic_recording.extraction_scheduled');
  		let page_name = i18n('traffic_recording.traffic_extraction_jobs');
  		let ifid = ntopng_url_manager.get_url_entry("ifid");
  		let href = `<a href="/lua/if_stats.lua?ifid=${ifid}&page=traffic_recording&tab=jobs&job_id=${job_id}">${page_name}</a>`; 
  		alert_text_html = alert_text_html.replace('%{page}', href);
  		alert_text_html = `${alert_text_html} ${job_id}`;
  		ntopng_events_manager.emit_custom_event(ntopng_custom_events.SHOW_GLOBAL_ALERT_INFO, alert_text_html);
  	    }
  	    this.$refs["modal"].close();
  	},
  	show: async function(bpf_filter) {
  	    if (bpf_filter == null) {
  		let url_params = ntopng_url_manager.get_url_params();
  		let url_request = `${base_path}/lua/pro/rest/v2/get/db/filter/bpf.lua?${url_params}`;
  		let res = await ntopng_utility.http_request(url_request);
  		if (res == null || res.bpf == null) {
  		    console.error(`modal-traffic-extraction: ${url_request} return null value`);
  		    return;
  		}
  		bpf_filter = res.bpf;
  	    }
  	    let status = ntopng_status_manager.get_status();
  	    if (status.epoch_begin == null || status.epoch_end == null) {
  		console.error("modal-traffic-extraction: epoch_begin and epoch_end undefined in url");
  		return;
  	    }
  	    let date_begin = new Date(status.epoch_begin * 1000);
  	    let date_end = new Date(status.epoch_end * 1000);
  	    
  	    let desc = i18n('traffic_recording.about_to_download_flow');
  	    desc = desc.replace('%{date_begin}', this.format_date(date_begin));
  	    desc = desc.replace('%{date_end}', this.format_date(date_end));
  	    this.description = desc;
  	    
  	    // let url_params = ntopng_url_manager.get_url_params();
  	    // let url_request = `${base_path}/lua/pro/rest/v2/get/db/filter/bpf.lua?${url_params}`;
  	    // let res = await ntopng_utility.http_request(url_request);
  	    // this.bpf_filter = res.bpf;
  	    this.bpf_filter = bpf_filter;
  	    this.$refs["modal"].show();
  	},
  	show_hide_menu: function() {
  	    this.show_menu = !this.show_menu;
  	},
      },
  });

  const _withId$1 = /*#__PURE__*/withScopeId();

  pushScopeId("data-v-0be978c4");
  const _hoisted_1$2 = { style: {"height":"95%"} };
  const _hoisted_2$2 = {
    class: "tab-content",
    style: {"height":"100%"}
  };
  const _hoisted_3$2 = { class: "row" };
  const _hoisted_4$2 = { class: "form-group mb-3 col-md-3 has-feedback" };
  const _hoisted_5$2 = { class: "form-group mb-3 col-md-9 text-right asd" };
  const _hoisted_6$2 = { class: "radio-inline" };
  const _hoisted_7$2 = { class: "radio-inline" };
  const _hoisted_8$1 = {
    class: "row",
    id: "pcapDownloadModal_advanced",
    style: {}
  };
  const _hoisted_9$1 = { class: "form-group mb-3 col-md-12 has-feedback" };
  const _hoisted_10$1 = /*#__PURE__*/createVNode("br", null, null, -1 /* HOISTED */);
  const _hoisted_11$1 = { class: "form-label" };
  const _hoisted_12 = /*#__PURE__*/createVNode("a", {
    class: "ntopng-external-link",
    href: "https://www.ntop.org/guides/n2disk/filters.html"
  }, [
    /*#__PURE__*/createVNode("i", { class: "fas fa-external-link-alt" })
  ], -1 /* HOISTED */);
  const _hoisted_13 = { class: "input-group" };
  const _hoisted_14 = /*#__PURE__*/createVNode("span", { class: "input-group-addon" }, [
    /*#__PURE__*/createVNode("span", { class: "glyphicon glyphicon-filter" })
  ], -1 /* HOISTED */);
  const _hoisted_15 = /*#__PURE__*/createVNode("br", null, null, -1 /* HOISTED */);
  const _hoisted_16 = { class: "form-label" };
  const _hoisted_17 = /*#__PURE__*/createVNode("br", null, null, -1 /* HOISTED */);
  const _hoisted_18 = /*#__PURE__*/createVNode("ul", null, [
    /*#__PURE__*/createVNode("li", null, [
      /*#__PURE__*/createTextVNode("Host: "),
      /*#__PURE__*/createVNode("i", null, "host 192.168.1.2")
    ]),
    /*#__PURE__*/createVNode("li", null, [
      /*#__PURE__*/createTextVNode("HTTP: "),
      /*#__PURE__*/createVNode("i", null, "tcp and port 80")
    ]),
    /*#__PURE__*/createVNode("li", null, [
      /*#__PURE__*/createTextVNode("Traffic between hosts: "),
      /*#__PURE__*/createVNode("i", null, "ip host 192.168.1.1 and 192.168.1.2")
    ]),
    /*#__PURE__*/createVNode("li", null, [
      /*#__PURE__*/createTextVNode("Traffic from an host to another: "),
      /*#__PURE__*/createVNode("i", null, "ip src 192.168.1.1 and dst 192.168.1.2")
    ])
  ], -1 /* HOISTED */);
  popScopeId();

  const render$2 = /*#__PURE__*/_withId$1((_ctx, _cache, $props, $setup, $data, $options) => {
    const _component_modal = resolveComponent("modal");

    return (openBlock(), createBlock(_component_modal, {
      id: _ctx.id_modal,
      onApply: _ctx.apply,
      ref: "modal"
    }, {
      title: _withId$1(() => [
        createTextVNode(toDisplayString(_ctx.i18n('traffic_recording.pcap_extract')), 1 /* TEXT */)
      ]),
      body: _withId$1(() => [
        createVNode("div", {
          class: "alert alert-info",
          innerHTML: _ctx.description
        }, null, 8 /* PROPS */, ["innerHTML"]),
        createVNode("form", _hoisted_1$2, [
          createVNode("div", _hoisted_2$2, [
            createVNode("div", _hoisted_3$2, [
              createVNode("div", _hoisted_4$2, [
                createVNode("button", {
                  class: "btn btn-sm btn-secondary",
                  type: "button",
                  onClick: _cache[1] || (_cache[1] = (...args) => (_ctx.show_hide_menu && _ctx.show_hide_menu(...args)))
                }, [
                  createTextVNode(toDisplayString(_ctx.i18n('advanced')), 1 /* TEXT */),
                  createVNode("i", {
                    class: { 'fas fa-caret-down': _ctx.show_menu, 'fas fa-caret-up': !_ctx.show_menu}
                  }, null, 2 /* CLASS */)
                ])
              ]),
              createVNode("div", _hoisted_5$2, [
                createVNode("label", _hoisted_6$2, [
                  withDirectives(createVNode("input", {
                    type: "radio",
                    name: "extract_now",
                    "onUpdate:modelValue": _cache[2] || (_cache[2] = $event => (_ctx.extract_now = $event)),
                    value: "true",
                    checked: ""
                  }, null, 512 /* NEED_PATCH */), [
                    [vModelRadio, _ctx.extract_now]
                  ]),
                  createTextVNode(toDisplayString(_ctx.i18n('traffic_recording.extract_now')), 1 /* TEXT */)
                ]),
                createVNode("label", _hoisted_7$2, [
                  withDirectives(createVNode("input", {
                    type: "radio",
                    name: "extract_now",
                    "onUpdate:modelValue": _cache[3] || (_cache[3] = $event => (_ctx.extract_now = $event)),
                    value: "false"
                  }, null, 512 /* NEED_PATCH */), [
                    [vModelRadio, _ctx.extract_now]
                  ]),
                  createTextVNode(toDisplayString(_ctx.i18n('traffic_recording.queue_as_job')), 1 /* TEXT */)
                ])
              ])
            ]),
            withDirectives(createVNode("div", _hoisted_8$1, [
              createVNode("div", _hoisted_9$1, [
                _hoisted_10$1,
                createVNode("label", _hoisted_11$1, [
                  createTextVNode(toDisplayString(_ctx.i18n('traffic_recording.filter_nbpf')), 1 /* TEXT */),
                  _hoisted_12
                ]),
                createVNode("div", _hoisted_13, [
                  _hoisted_14,
                  withDirectives(createVNode("input", {
                    name: "bpf_filter",
                    "onUpdate:modelValue": _cache[4] || (_cache[4] = $event => (_ctx.bpf_filter = $event)),
                    class: "form-control input-sm",
                    "data-bpf": "bpf",
                    autocomplete: "off",
                    spellcheck: "false"
                  }, null, 512 /* NEED_PATCH */), [
                    [vModelText, _ctx.bpf_filter]
                  ]),
                  withDirectives(createVNode("span", {
                    style: {"margin":"0px","padding":"0","display":"block"},
                    class: "invalid-feedback "
                  }, toDisplayString(_ctx.i18n('invalid_value')), 513 /* TEXT, NEED_PATCH */), [
                    [vShow, _ctx.invalid_bpf]
                  ])
                ]),
                _hoisted_15,
                createVNode("label", _hoisted_16, toDisplayString(_ctx.i18n('traffic_recording.filter_examples')) + ":", 1 /* TEXT */),
                _hoisted_17,
                _hoisted_18
              ])
            ], 512 /* NEED_PATCH */), [
              [vShow, _ctx.show_menu]
            ])
          ])
        ])
      ]),
      footer: _withId$1(() => [
        createVNode("button", {
          type: "button",
          onClick: _cache[5] || (_cache[5] = (...args) => (_ctx.apply && _ctx.apply(...args))),
          class: "btn btn-primary"
        }, toDisplayString(_ctx.i18n('apply')), 1 /* TEXT */)
      ]),
      _: 1 /* STABLE */
    }, 8 /* PROPS */, ["id", "onApply"]))
  });

  var css_248z$1 = "\ninput ~ .alert[data-v-0be978c4] {\n  display: none;\n}\ninput:invalid ~ .alert[data-v-0be978c4] {\n  display: block;\n}\n";
  styleInject(css_248z$1);

  script$2.render = render$2;
  script$2.__scopeId = "data-v-0be978c4";
  script$2.__file = "http_src/vue/modal-traffic-extraction.vue";

  var script$1 = defineComponent({
      components: {
      },
      props: {
  	id: String,
  	main_title: String,
  	main_icon: String,
  	help_link: String,
  	items_table: Array,
      },
      emits: ["click_item"],
      /** This method is the first method of the component called, it's called before html template creation. */
      created() {
      },
      data() {
  	return {
  	    //i18n: (t) => i18n(t),
  	};
      },
      /** This method is the first method called after html template creation. */
      mounted() {
  	ntopng_sync.ready(this.$props["id"]);
      },
      methods: {
      },
  });

  const _hoisted_1$1 = { class: "navbar navbar-shadow navbar-expand-lg navbar-light bg-light px-2 mb-2" };
  const _hoisted_2$1 = {
    class: "me-1 text-nowrap",
    style: {"font-size":"1.1rem"}
  };
  const _hoisted_3$1 = /*#__PURE__*/createVNode("span", { class: "text-muted ms-1 d-none d-lg-inline d-md-none" }, "|", -1 /* HOISTED */);
  const _hoisted_4$1 = /*#__PURE__*/createVNode("button", {
    class: "navbar-toggler",
    type: "button"
  }, [
    /*#__PURE__*/createVNode("span", { class: "navbar-toggler-icon" })
  ], -1 /* HOISTED */);
  const _hoisted_5$1 = {
    class: "collapse navbar-collapse scroll-x",
    id: "navbarNav"
  };
  const _hoisted_6$1 = { class: "navbar-nav" };
  const _hoisted_7$1 = {
    key: 0,
    class: "badge rounded-pill bg-dark",
    style: {"float":"right","margin-bottom":"-10px"}
  };
  const _hoisted_8 = {
    key: 0,
    class: "badge rounded-pill bg-dark",
    style: {"float":"right","margin-bottom":"-10px"}
  };
  const _hoisted_9 = { class: "navbar-nav ms-auto" };
  const _hoisted_10 = /*#__PURE__*/createVNode("a", {
    href: "javascript:history.back()",
    class: "nav-item nav-link text-muted"
  }, [
    /*#__PURE__*/createVNode("i", { class: "fas fa-arrow-left" })
  ], -1 /* HOISTED */);
  const _hoisted_11 = /*#__PURE__*/createVNode("i", { class: "fas fa-question-circle" }, null, -1 /* HOISTED */);

  function render$1(_ctx, _cache, $props, $setup, $data, $options) {
    return (openBlock(), createBlock("nav", _hoisted_1$1, [
      createVNode("span", _hoisted_2$1, [
        createVNode("i", { class: _ctx.main_icon }, null, 2 /* CLASS */),
        createTextVNode(" " + toDisplayString(_ctx.main_title), 1 /* TEXT */)
      ]),
      _hoisted_3$1,
      _hoisted_4$1,
      createVNode("div", _hoisted_5$1, [
        createVNode("ul", _hoisted_6$1, [
          (openBlock(true), createBlock(Fragment, null, renderList(_ctx.items_table, (item) => {
            return (openBlock(), createBlock(Fragment, null, [
              (item.active)
                ? (openBlock(), createBlock("li", {
                    key: 0,
                    onClick: $event => (this.$emit('click_item', item)),
                    class: [{ 'active': item.active }, "nav-item nav-link"]
                  }, [
                    (item.badge_num > 0)
                      ? (openBlock(), createBlock("span", _hoisted_7$1, toDisplayString(item.badge_num), 1 /* TEXT */))
                      : createCommentVNode("v-if", true),
                    createVNode("b", null, [
                      createVNode("i", {
                        class: item.icon
                      }, null, 2 /* CLASS */),
                      createTextVNode(" " + toDisplayString(item.label), 1 /* TEXT */)
                    ])
                  ], 10 /* CLASS, PROPS */, ["onClick"]))
                : (openBlock(), createBlock("a", {
                    key: 1,
                    onClick: $event => (this.$emit('click_item', item)),
                    href: "#",
                    class: "nav-item nav-link"
                  }, [
                    (item.badge_num > 0)
                      ? (openBlock(), createBlock("span", _hoisted_8, toDisplayString(item.badge_num), 1 /* TEXT */))
                      : createCommentVNode("v-if", true),
                    createVNode("i", {
                      class: item.icon
                    }, null, 2 /* CLASS */),
                    createTextVNode(" " + toDisplayString(item.label), 1 /* TEXT */)
                  ], 8 /* PROPS */, ["onClick"]))
            ], 64 /* STABLE_FRAGMENT */))
          }), 256 /* UNKEYED_FRAGMENT */))
        ]),
        createVNode("ul", _hoisted_9, [
          _hoisted_10,
          createVNode("a", {
            target: "_newtab",
            href: _ctx.help_link,
            class: "nav-item nav-link text-muted"
          }, [
            _hoisted_11
          ], 8 /* PROPS */, ["href"])
        ])
      ])
    ]))
  }

  script$1.render = render$1;
  script$1.__file = "http_src/vue/page-navbar.vue";

  function get_page(alert_stats_page) {
      let page = ntopng_url_manager.get_url_entry("page");
      if (page == null) {
  	if (alert_stats_page) {
  	    page = "all";
  	} else {
  	    page = "overview";
  	}
      }
      return page;
  }

  async function get_filter_const(is_alert_stats_url, page) {
      let url_request;
      if (is_alert_stats_url) {
  	url_request = `${base_path}/lua/rest/v2/get/alert/filter/consts.lua?page=${page}`;
      } else {
  	let query_preset = ntopng_url_manager.get_url_entry("query_preset");
  	if (query_preset == null) { query_preset = ""; }
  	url_request = `${base_path}/lua/pro/rest/v2/get/db/filter/consts.lua?page=${page}&query_preset=${query_preset}`;
      }
      let filter_consts = await ntopng_utility.http_request(url_request);
      return filter_consts;
  }

  let FILTERS_CONST = [];
  let TAG_OPERATORS;
  let DEFINED_TAGS;
  const VIEW_ONLY_TAGS = true;
  /* Initial Tags */
  let initialTags; 
  //let pageHandle = {};
  let TAGIFY;
  let IS_ALERT_STATS_URL = window.location.toString().match(/alert_stats.lua/) != null;
  let QUERY_PRESETS = ntopng_url_manager.get_url_entry("query_preset");
  if (QUERY_PRESETS == null) {
      QUERY_PRESETS = "";
  }
  let STATUS_VIEW = ntopng_url_manager.get_url_entry("status");
  if (STATUS_VIEW == null || STATUS_VIEW == "") {
      STATUS_VIEW = "historical";
  }
  const ENABLE_QUERY_PRESET = !IS_ALERT_STATS_URL;

  let PAGE = get_page(IS_ALERT_STATS_URL);

  const create_tag_from_filter = function(filter) {
      let f_const = FILTERS_CONST.find((f) => f.id == filter.id);
      if (f_const == null) { console.error("create_tag_from_filter: filter const not found;"); }
      
      let value_label = filter.value;
      if (f_const.options != null) {
  	let opt = f_const.options.find((o) => o.value == filter.value);
  	if (opt != null) {
  	    value_label = opt.label;
  	}
      }
      const tag = {
  	label: f_const.label,
  	key: f_const.id,
  	value: value_label,
  	realValue: filter.value,
  	title: `${f_const.label}${filter.operator}${value_label}`,
  	selectedOperator: filter.operator,
      };
      if (tag.value == "") { tag.value = "''"; }
      if (tag.realValue == null || tag.selectedOperator == null || tag.selectedOperator == "") {
  	return null;
      }
      return tag;
  };  

  const load_filters_data = async function() {    
      FILTERS_CONST = await get_filter_const(IS_ALERT_STATS_URL, PAGE);
      FILTERS_CONST.filter((x) => x.label == null).forEach((x) => { console.error(`label not defined for filter ${JSON.stringify(x)}`); x.label = ""; });
      FILTERS_CONST.sort((a, b) => a.label.localeCompare(b.label));
      i18n_ext.tags = {};
      TAG_OPERATORS = {};
      DEFINED_TAGS = {};
      FILTERS_CONST.forEach((f_def) => {
  	i18n_ext.tags[f_def.id] = f_def.label;
  	f_def.operators.forEach((op) => TAG_OPERATORS[op.id] = op.label);
  	DEFINED_TAGS[f_def.id] = f_def.operators.map((op) => op.id);
      });
      let entries = ntopng_url_manager.get_url_entries();
      let filters = [];
      for (const [key, value] of entries) {
      	let filter_def = FILTERS_CONST.find((fc) => fc.id == key);
      	if (filter_def != null) {
      	    let options_string = value.split(",");
  	    options_string.forEach((opt_stirng) => {
      		let [value, operator] = opt_stirng.split(";");
  		if (
  		    operator == null || value == null || operator == ""
  		    || (filter_def.options != null && filter_def.options.find((opt) => opt.value == value) == null)
  		   ) {
  		    return;
  		}
  		filters.push({id: filter_def.id, operator: operator, value: value});
  	    });
      	}	
      }
      return filters;
      // "l7proto=XXX;eq"
  };

  function get_filters_object(filters) {
      if (filters == null) { return {}; }
      let filters_groups = {};
      filters.forEach((f) => {
  	let group = filters_groups[f.id];
  	if (group == null) {
  	    group = [];
  	    filters_groups[f.id] = group;
  	}
  	group.push(f);
      });
      let filters_object = {};
      for (let f_id in filters_groups) {
  	let group = filters_groups[f_id];
  	let filter_values = group.filter((f) => f.value != null && f.operator != null && f.operator != "").map((f) => `${f.value};${f.operator}`).join(",");
  	filters_object[f_id] = filter_values;
      }
      return filters_object;
  }

  async function set_query_preset(range_picker_vue) {
      let page = range_picker_vue.page;
      let url_request = `${base_path}/lua/pro/rest/v2/get/db/preset/consts.lua?page=${page}`;
      let res = await ntopng_utility.http_request(url_request);
      let query_preset = res[0].list.map((el) => {
  	return {
  	    value: el.id, //== null ? "flow" : el.id,
  	    name: el.name,
  	    builtin: true,
  	};
      });
      if (res.length > 1) {
  	res[1].list.forEach((el) => {
      	    let query = {
      		value: el.id,
      		name: el.name,
      	    };
      	    query_preset.push(query);
  	});
      }
      if (range_picker_vue.query_presets == null || range_picker_vue.query_presets == "") {
  	range_picker_vue.query_presets = query_preset[0].value;	
  	ntopng_url_manager.set_key_to_url("query_preset", query_preset[0].value);
      }
      range_picker_vue.query_preset = query_preset;
      return res;
  }

  var script = {
      props: {
  	id: String,
      },
      components: {	  
     	'data-time-range-picker': script$6,
  	'modal-filters': script$3,
      },
      /**
       * First method called when the component is created.
       */
      created() {
      },
      async mounted() {
  	let dt_range_picker_mounted = ntopng_sync.on_ready(this.id_data_time_range_picker);
  	let modal_filters_mounted = ntopng_sync.on_ready(this.id_modal_filters);
  	await dt_range_picker_mounted;

  	if (this.enable_query_preset) {
  	    await set_query_preset(this);
  	}
  	if (this.page != 'all') {
  	    let filters = await load_filters_data();
  	    
  	    TAGIFY = create_tagify(this);
  	    ntopng_events_manager.emit_event(ntopng_events.FILTERS_CHANGE, {filters});
  	    ntopng_events_manager.on_event_change(this.$props["id"], ntopng_events.FILTERS_CHANGE, (status) => this.reload_status(status), true);
  	}
  	this.modal_data = FILTERS_CONST;
  	
  	await modal_filters_mounted;
  	ntopng_sync.ready(this.$props["id"]);
      },
      data() {
  	return {
  	    i18n: i18n,
  	    id_modal_filters: `${this.$props.id}_modal_filters`,
  	    id_data_time_range_picker: `${this.$props.id}_data-time-range-picker`,
  	    show_filters: false,
  	    edit_tag: null,
  	    is_alert_stats_url: IS_ALERT_STATS_URL,
  	    query_preset: [],
  	    query_presets: QUERY_PRESETS,
  	    status_view: STATUS_VIEW,
  	    enable_query_preset: ENABLE_QUERY_PRESET,
  	    page: PAGE,
  	    modal_data: [],
  	    last_filters: [],
  	};
      },
      methods: {
  	is_filter_defined: function(filter) {
  	    return DEFINED_TAGS[filter.id] != null;
  	},
  	update_status_view: function(status) {
  	    ntopng_url_manager.set_key_to_url("status", status);
  	    ntopng_url_manager.reload_url();	    
  	},
  	update_select_query_presets: function() {
  	    ntopng_url_manager.get_url_params();
  	    ntopng_url_manager.set_key_to_url("query_preset", this.query_presets);
  	    ntopng_url_manager.reload_url();
  	},
  	show_modal_filters: function() {
  	    this.$refs["modal_filters"].show();
  	},
  	remove_filters: function() {
  	    let filters = [];
  	    ntopng_events_manager.emit_event(ntopng_events.FILTERS_CHANGE, {filters});
  	},
  	reload_status: function(status) {
  	    let filters = status.filters;
  	    if (filters == null) { return; }
  	    // delete all previous filter
  	    ntopng_url_manager.delete_params(FILTERS_CONST.map((f) => f.id));
  	    TAGIFY.tagify.removeAllTags();
  	    let filters_object = get_filters_object(filters);
  	    ntopng_url_manager.add_obj_to_url(filters_object);
  	    filters.forEach((f) => {
  		let tag = create_tag_from_filter(f);
  		if (tag == null) { return; }
  		TAGIFY.addFilterTag(tag);
  	    });
  	    this.last_filters = filters;
  	},
  	apply_modal: function(params) {
  	    let status = ntopng_status_manager.get_status();
  	    let filters = status.filters;
  	    if (filters == null) { filters = []; }
  	    if (this.edit_tag != null) {
  		filters = filters.filter((f) => f.id != this.edit_tag.key || f.value != this.edit_tag.realValue);
  		this.edit_tag = null;
  	    }
  	    filters.push(params);
  	    
  	    // trigger event and then call reload_status
  	    ntopng_events_manager.emit_event(ntopng_events.FILTERS_CHANGE, {filters});
  	},
      },
  };

  function create_tagify(range_picker_vue) {
      // create tagify
      const tagify = new Tagify(range_picker_vue.$refs["tagify"], {
  	duplicates: true,
  	delimiters : null,
  	dropdown : {
              enabled: 1, // suggest tags after a single character input
              classname : 'extra-properties' // custom class for the suggestions dropdown
  	},
  	autoComplete: { enabled: false },
  	templates : {
              tag : function(tagData){
  		try{
                      return `<tag title='${tagData.value}' contenteditable='false' spellcheck="false" class='tagify__tag ${tagData.class ? tagData.class : ""}' ${this.getAttributes(tagData)}>
                        <x title='remove tag' class='tagify__tag__removeBtn'></x>
                        <div>
                            ${tagData.label ? `<b>${tagData.label}</b>&nbsp;` : ``}
                            ${!VIEW_ONLY_TAGS && tagData.operators ? `<select class='operator'>${tagData.operators.map(op => `<option ${tagData.selectedOperator === op ? 'selected' : ''} value='${op}'>${TAG_OPERATORS[op]}</option>`).join()}</select>` : `<b class='operator'>${tagData.selectedOperator ? TAG_OPERATORS[tagData.selectedOperator] : '='}</b>`}&nbsp;
                            <span class='tagify__tag-text'>${tagData.value}</span>
                        </div>
                    </tag>`
  		}
  		catch(err){
                      console.error(`An error occured when creating a new tag: ${err}`);
  		}
              },
  	},
  	validate: function(tagData) {
  	    return (typeof tagData.key !== 'undefined' &&
  		    typeof tagData.selectedOperator !== 'undefined' &&
  		    typeof tagData.value !== 'undefined');
  	}
      });
      
      $(document).ready(function() {
  	// add existing tags
  	tagify.addTags(initialTags);
      }); /* $(document).ready() */
      
      const addFilterTag = async function(tag) {
          /* Convert values to string (this avoids issues e.g. with 0) */
          if (typeof tag.realValue == 'number') { tag.realValue = ''+tag.realValue; }
          if (typeof tag.value == 'number') { tag.value = ''+tag.value; }
  	
          const existingTagElms = tagify.getTagElms();
  	
          /* Lookup by key, value and operator (do not add the same key and value multiple times) */
          let existingTagElement = existingTagElms.find(htmlTag => 
  						      htmlTag.getAttribute('key') === tag.key
  						      && htmlTag.getAttribute('realValue') === tag.realValue 
  						      //&& htmlTag.getAttribute('selectedOperator') === tag.selectedOperator
  						     );
          let existingTag = tagify.tagData(existingTagElement);
          if (existingTag !== undefined) {
              return;
          }
  	
          // has the tag an operator object?
          if (DEFINED_TAGS[tag.key] && !Array.isArray(DEFINED_TAGS[tag.key])) {
              tag.operators = DEFINED_TAGS[tag.key].operators;
          }
  	
          if (!tag.selectedOperator) {
              tag.selectedOperator = 'eq';
          }
          // add filter!
          tagify.addTags([tag]);
      };
      
      // when an user remove the tag
      tagify.on('remove', async function(e) {
        const key = e.detail.data.key;
        const value = e.detail.data.realValue;
        const status = ntopng_status_manager.get_status();
        
        if (key === undefined) { return; }
        if (status.filters == null) { return; }

        const filters = status.filters.filter((f) => (f.id != key || (f.id == key && f.value != value)));
        ntopng_events_manager.emit_event(ntopng_events.FILTERS_CHANGE, {filters});	
      });
      
      tagify.on('add', async function(e) {
          const detail = e.detail;
          if (detail.data === undefined) { return; }	
          const tag = detail.data;	
          // let's check if the tag has a key field
          if (!tag.key) {
              tagify.removeTags([e.detail.tag]);
              e.preventDefault();
              e.stopPropagation();
              return;
          }	
      });
      
      // Tag 'click' event handler to open the 'Edit' modal. Note: this prevents
      // inline editing of the tag ('edit:updated' is never called as a consequence)
      tagify.on('click', async function(e) {
          const detail = e.detail;	
          if (detail.data === undefined) { return; }
          if (detail.data.key === undefined) {return;}
          const tag = detail.data;
  	// remember that this tag already exixts
  	range_picker_vue.edit_tag = tag;
  	// show modal-filters
  	ntopng_events_manager.emit_custom_event(ntopng_custom_events.SHOW_MODAL_FILTERS, {id: tag.key, operator: tag.selectedOperator, value: tag.realValue});
      });
      
      tagify.on('edit:updated', async function(e) {
  	console.warn("UPDATED");
  	return;
      });
      
      $(`tags`).on('change', 'select.operator', async function(e) {
  	console.warn("TAGS change");
  	return;
      });
      return {
  	tagify,
  	addFilterTag,
      };
  }

  const _withId = /*#__PURE__*/withScopeId();

  pushScopeId("data-v-aaee59ea");
  const _hoisted_1 = { style: {"width":"100%"} };
  const _hoisted_2 = { class: "mb-1" };
  const _hoisted_3 = {
    key: 0,
    class: "d-flex align-items-center me-2"
  };
  const _hoisted_4 = {
    class: "btn-group",
    id: "statusSwitch",
    role: "group"
  };
  const _hoisted_5 = {
    key: 0,
    class: "d-flex mt-1",
    style: {"width":"100%"}
  };
  const _hoisted_6 = /*#__PURE__*/createVNode("span", null, [
    /*#__PURE__*/createVNode("i", {
      class: "fas fa-plus",
      "data-original-title": "",
      title: "Add Filter"
    })
  ], -1 /* HOISTED */);
  const _hoisted_7 = /*#__PURE__*/createVNode("i", { class: "fas fa-times" }, null, -1 /* HOISTED */);
  popScopeId();

  const render = /*#__PURE__*/_withId((_ctx, _cache, $props, $setup, $data, $options) => {
    const _component_modal_filters = resolveComponent("modal-filters");
    const _component_data_time_range_picker = resolveComponent("data-time-range-picker");

    return (openBlock(), createBlock("div", _hoisted_1, [
      createVNode("div", _hoisted_2, [
        createVNode(_component_modal_filters, {
          filters_options: $data.modal_data,
          onApply: $options.apply_modal,
          ref: "modal_filters",
          id: $data.id_modal_filters
        }, null, 8 /* PROPS */, ["filters_options", "onApply", "id"]),
        createVNode(_component_data_time_range_picker, { id: $data.id_data_time_range_picker }, {
          begin: _withId(() => [
            ($data.is_alert_stats_url)
              ? (openBlock(), createBlock("div", _hoisted_3, [
                  createVNode("div", _hoisted_4, [
                    createVNode("a", {
                      href: "#",
                      onClick: _cache[1] || (_cache[1] = $event => ($options.update_status_view('historical'))),
                      class: ["btn btn-sm", {'active': $data.status_view == 'historical', 'btn-seconday': $data.status_view != 'historical', 'btn-primary': $data.status_view == 'historical'}]
                    }, "Past", 2 /* CLASS */),
                    createVNode("a", {
                      href: "#",
                      onClick: _cache[2] || (_cache[2] = $event => ($options.update_status_view('acknowledged'))),
                      class: ["btn btn-sm", {'active': $data.status_view == 'acknowledged', 'btn-seconday': $data.status_view != 'acknowledged', 'btn-primary': $data.status_view == 'acknowledged'}]
                    }, "Ack", 2 /* CLASS */),
                    ($data.page != 'flow')
                      ? (openBlock(), createBlock("a", {
                          key: 0,
                          href: "#",
                          onClick: _cache[3] || (_cache[3] = $event => ($options.update_status_view('engaged'))),
                          class: ["btn btn-sm", {'active': $data.status_view == 'engaged', 'btn-seconday': $data.status_view != 'engaged', 'btn-primary': $data.status_view == 'engaged'}]
                        }, "Engaged", 2 /* CLASS */))
                      : createCommentVNode("v-if", true)
                  ])
                ]))
              : createCommentVNode("v-if", true),
            ($data.enable_query_preset)
              ? withDirectives((openBlock(), createBlock("select", {
                  key: 1,
                  class: "me-2 form-select",
                  "onUpdate:modelValue": _cache[4] || (_cache[4] = $event => ($data.query_presets = $event)),
                  onChange: _cache[5] || (_cache[5] = $event => ($options.update_select_query_presets()))
                }, [
                  (openBlock(true), createBlock(Fragment, null, renderList($data.query_preset, (item) => {
                    return (openBlock(), createBlock(Fragment, null, [
                      (item.builtin == true)
                        ? (openBlock(), createBlock("option", {
                            key: 0,
                            value: item.value
                          }, toDisplayString(item.name), 9 /* TEXT, PROPS */, ["value"]))
                        : createCommentVNode("v-if", true)
                    ], 64 /* STABLE_FRAGMENT */))
                  }), 256 /* UNKEYED_FRAGMENT */)),
                  ($data.page != 'analysis')
                    ? (openBlock(), createBlock("optgroup", {
                        key: 0,
                        label: $data.i18n('queries.queries')
                      }, [
                        (openBlock(true), createBlock(Fragment, null, renderList($data.query_preset, (item) => {
                          return (openBlock(), createBlock(Fragment, null, [
                            (!item.builtin)
                              ? (openBlock(), createBlock("option", {
                                  key: 0,
                                  value: item.value
                                }, toDisplayString(item.name), 9 /* TEXT, PROPS */, ["value"]))
                              : createCommentVNode("v-if", true)
                          ], 64 /* STABLE_FRAGMENT */))
                        }), 256 /* UNKEYED_FRAGMENT */))
                      ], 8 /* PROPS */, ["label"]))
                    : createCommentVNode("v-if", true)
                ], 544 /* HYDRATE_EVENTS, NEED_PATCH */)), [
                  [vModelSelect, $data.query_presets]
                ])
              : createCommentVNode("v-if", true)
          ]),
          extra_buttons: _withId(() => [
            renderSlot(_ctx.$slots, "extra_range_buttons")
          ]),
          _: 1 /* STABLE */
        }, 8 /* PROPS */, ["id"])
      ]),
      createCommentVNode(" tagify "),
      ($data.page != 'all')
        ? (openBlock(), createBlock("div", _hoisted_5, [
            createVNode("input", {
              class: "w-100 form-control h-auto",
              name: "tags",
              ref: "tagify",
              placeholder: $data.i18n('show_alerts.filters')
            }, null, 8 /* PROPS */, ["placeholder"]),
            withDirectives(createVNode("button", {
              class: "btn btn-link",
              "aria-controls": "flow-alerts-table",
              type: "button",
              id: "btn-add-alert-filter",
              onClick: _cache[6] || (_cache[6] = (...args) => ($options.show_modal_filters && $options.show_modal_filters(...args)))
            }, [
              _hoisted_6
            ], 512 /* NEED_PATCH */), [
              [vShow, $data.modal_data && $data.modal_data.length > 0]
            ]),
            withDirectives(createVNode("button", {
              "data-bs-toggle": "tooltip",
              "data-placement": "bottom",
              title: "{{ i18n('show_alerts.remove_filters') }}",
              onClick: _cache[7] || (_cache[7] = (...args) => ($options.remove_filters && $options.remove_filters(...args))),
              class: "btn ms-1 my-auto btn-sm btn-remove-tags"
            }, [
              _hoisted_7
            ], 512 /* NEED_PATCH */), [
              [vShow, $data.modal_data && $data.modal_data.length > 0]
            ])
          ]))
        : createCommentVNode("v-if", true),
      createCommentVNode(" end tagify ")
    ]))
  });

  var css_248z = "\n.tagify__input[data-v-aaee59ea] {\n  min-width: 175px;\n}\n.tagify__tag[data-v-aaee59ea] {\n  white-space: nowrap;\n  margin: 3px 0px 5px 5px;\n}\n.tagify__tag select.operator[data-v-aaee59ea] {\n  margin: 0px 4px;\n  border: 1px solid #c4c4c4;\n  border-radius: 4px;\n}\n.tagify__tag b.operator[data-v-aaee59ea] {\n  margin: 0px 4px;\n  background-color: white;\n  border: 1px solid #c4c4c4;\n  border-radius: 4px;\n  padding: 0.05em 0.2em;\n}\n.tagify__tag > div[data-v-aaee59ea] {\n  display: flex;\n  align-items: center;\n}\n";
  styleInject(css_248z);

  script.render = render;
  script.__scopeId = "data-v-aaee59ea";
  script.__file = "http_src/vue/range-picker.vue";

  let ntopVue = {
      AlertInfo: script$a,
      Chart: script$9,
      Datatable: script$7,
      DateTimeRangePicker: script$6,

      Modal: script$8,
      ModalAddCheckExclusion: script$4,
      ModalFilters: script$3,
      ModalTrafficExtraction: script$2,
      ModalDeleteConfirm: script$5,

      RangePicker: script,
      PageNavbar: script$1,

      Vue: Vue,
  };
  window.ntopVue = ntopVue;

})();
