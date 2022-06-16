// ==UserScript==
// @name     [UltimateGuitar] Rocksmith tab coloring
// @version  1
// @grant    none
// @author   sergilazaro
// @match    https://ultimate-guitar.com/*
// @match    https://*.ultimate-guitar.com/*
// @match    http://ultimate-guitar.com/*
// @match    http://*.ultimate-guitar.com/*
// ==/UserScript==

const regex_string = /^.*[\||\:|\[][\S\s]*$/; // containing at least vertical lines and/or double colon
const regex_dash = /^\-*$/;
const regex_muted = /^[xX]+$/;

const colors_foreground = ['#f200ff', '#00d811', '#ff8b00', '#00beff', '#ffe900', '#ff0000'];
const color_default_foreground = '#e0e0e0';
const color_default_background = '#333333';

// heuristic to check that this page is a tab and not chords or other
function detect_tab()
{
	if (document.title.includes("TAB by") && !document.title.includes("TAB (ver "))
		return true;

	const elements = document.querySelectorAll('article > section > header > div');

	if (elements.length > 0 && elements[0].innerHTML.includes("Chords"))
		return false;

	return true;
}

function has_char_at_start(line, ch)
{
	var line_pos = line.indexOf(ch);
	return (line_pos >= 0) && (line_pos < 4);
}

function has_char_at_end(line, ch)
{
	var line_pos = line.lastIndexOf(ch);
	return (line_pos >= 0) && (line_pos >= line.length - 4);
}

// heuristic to identify guitar strings
function detect_guitar_string(line)
{
	const num_dashes = line.split('-').length - 1;

	// check with regex and that it contains some dashes
	if (!regex_string.test(line) || (num_dashes < 5))
		return false;

	// special case for when it's a split tab run that doesn't start with the string names, and just looks like --------|
	if (has_char_at_start(line, '-') && has_char_at_end(line, '|'))
		return true;

	if (!has_char_at_start(line, '|') && !has_char_at_start(line, ':') && !has_char_at_start(line, '['))
		return false;

	return true;
}


window.onload = function ()
{
	if (!detect_tab())
		return;

	const holder_code = document.querySelectorAll('code')[0];
	holder_code.style.backgroundColor = color_default_background;
	holder_code.style.padding = '20px';

	const holder_code_pre = document.querySelectorAll('code > pre')[0];
	holder_code_pre.style.color = color_default_foreground;
	holder_code_pre.style.backgroundColor = color_default_background;

	const spans = document.querySelectorAll('span');

	// list of list of spans
	var string_spans = [];

	var span_run = [];

	spans.forEach(function(subspan)
	{
		if (subspan.children.length > 0)
			return;
		
		if (detect_guitar_string(subspan.textContent))
		{
			span_run.push(subspan);
		}
		else
		{
			if (span_run.length == 4 || span_run.length == 6)
			{
				string_spans.push(span_run);
			}

			span_run = [];
		}
	});

	string_spans.forEach(function(span_list)
	{
		const num_strings = span_list.length;
		var index = 6 - num_strings;

		span_list.forEach(function(subspan)
		{
			var foreground_color = colors_foreground[index];

			var is_dash = false;
			var is_line = false;
			var current_str = "";
			var tokens = [];

			for (var str_i = 0; str_i < subspan.textContent.length; str_i++)
			{
				var current_char = subspan.textContent[str_i];
				var current_is_dash = (current_char == '-');
				var current_is_line = (current_char == '|') || (current_char == ':') || (current_char == '[') || (current_char == ']') || (current_char == '.');
				var change = (str_i > 0) && ((is_dash != current_is_dash) || (is_line != current_is_line));

				if (change)
				{
					tokens.push(current_str);
					current_str = "";
				}

				is_dash = current_is_dash;
				is_line = current_is_line;

				current_str += subspan.textContent[str_i];
			}

			if (current_str.length > 0)
				tokens.push(current_str);

			var last_is_neutral = false;
			var last_token = tokens[tokens.length - 1];
			if (!last_token.endsWith("|"))
			{
				var rest = last_token.substring(0, last_token.lastIndexOf("|") + 1);
				var last = last_token.substring(last_token.lastIndexOf("|") + 1, last_token.length);

				tokens[tokens.length - 1] = rest;
				tokens.push(last);

				last_is_neutral = true;
			}

			var new_parent_span = document.createElement("span");

			for (var token_i = 0; token_i < tokens.length; token_i++)
			{
				var token = tokens[token_i];
				var new_span = document.createElement("span");

				var is_dash = regex_dash.test(token);
				var is_last = (token_i == tokens.length - 1);
				var is_neutral = (is_last && last_is_neutral) || token.includes("|") || token.includes(" ") || (token == "o") || (token == "O") || (token == ":") || (token == "[") || (token == "]") || (token == ".");

				// special case for the first token
				if (token.includes(" ") && token.length <= 3 && token_i == 0)
				is_neutral = false;

				if (is_neutral)
				{
					new_span.style.color = color_default_foreground;
				}
				else if (is_dash)
				{
					new_span.style.color = foreground_color;
					new_span.style.opacity = 0.25;
				}
				else
				{
					new_span.style.color = foreground_color;

					if (regex_muted.test(token))
						new_span.style.opacity = 0.4;
				}
				
				new_span.innerHTML = token;
				new_parent_span.appendChild(new_span);
			}

			subspan.parentNode.insertBefore(new_parent_span, subspan);
			subspan.style.display = 'none';

			index++;
		});
	});
}
