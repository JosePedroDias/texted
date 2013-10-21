(function(w) {

    var L = function() { console.log.apply(console, arguments); };

    w.texted = function(el, statusEl) {

        el.spellcheck = false;

        // TODO convert tabs to spaces?

        var indentation = 4;

        var repeat = function(s, n) {
            return new Array(n + 1).join(s);
        };

        var getCursor = function() {
            var v = el.value;
            var x = 0;
            var y = 0;
            var s = el.selectionStart;
            var e = el.selectionEnd;
            var c;
            var startFound = false;
            var cursor = {};
            for (var i = 0; ; ++i) {
                if (!startFound && i === s) {
                    cursor.s = {x:x, y:y};
                    startFound = true;
                }
                if (startFound && i === e) {
                    cursor.e = {x:x, y:y};
                    if (cursor.s.y !== cursor.e.y && cursor.e.x === 0) {
                        --cursor.e.y;
                        cursor.e.x = Number.MAX_VALUE;
                    }
                    return cursor;
                }
                c = v[i];
                if (c === '\n') {
                    ++y;
                    x = 0;
                }
                else {
                    ++x;
                }
            }
        };

        var findStringPos = function(lines, c) {
            var s = 0;
            var y = 0;
            while (y < c.y) {
                s += lines[y].length + 1;
                ++y;
            }
            s += Math.min(c.x, lines[y].length);
            return s;
        }

        var setCursor = function(lines, cs, ce) {
            var s = findStringPos(lines, cs);
            el.selectionStart = s;
            var e = ce ? findStringPos(lines, ce) : s;
            el.selectionEnd = e;
        };

        var getLines = function() {
            return el.value.split('\n');
        };

        var setLines = function(lines) {
            el.value = lines.join('\n');
        };

        var getLineIndentations = function(lines, fromL, toL) {
            var indents = {};
            var ind, l;
            for (var i = fromL; i <= toL; ++i) {
                l = lines[i];
                ind = 0;
                while (l[ind] === ' ') { ++ind; }
                indents[i] = ind;
            }
            return indents;
        };

        var evPdSp = function(ev, skipPD, skipSP) {
            if (!skipPD) { ev.preventDefault();  }
            if (!skipSP) { ev.stopPropagation(); }
        };

        var indentChars = '{'; // >

        el.addEventListener('keydown', function(ev) {
            //L(ev);
            var kc = ev.keyCode;
            var sh = ev.shiftKey;
            var ct = ev.ctrlKey;
            var mt = ev.metaKey; // command in mac
            var al = ev.altKey;

            if (kc === 9) {
                //L(sh ? 'dedent' : 'indent');
                evPdSp(ev);
                var lines = getLines();
                var c = getCursor();
                var indents = getLineIndentations(lines, c.s.y, c.e.y);

                for (var i = c.s.y; i <= c.e.y; ++i) {
                    var ind = indents[i];
                    var dt;
                    if (sh) {
                        ind -= indentation;
                        if (ind < 0) { ind = 0; }
                        dt = indents[i] - ind;
                        lines[i] = lines[i].substring(dt);
                    }
                    else {
                        lines[i] = repeat(' ', indentation) + lines[i];
                        c.e.x += indentation;
                    }
                }
                setLines(lines);
                setCursor(lines, c.s, c.e);
            }
            else if (kc === 13) {
                var lines = getLines();
                var c = getCursor();
                var l = c.s.y;
                var lastChar = lines[l][c.s.x-1];
                var addIndent = indentChars.indexOf(lastChar) !== -1;
                var text = lines[l].substring(c.s.x);
                lines[l] = lines[l].substring(0, c.s.x);

                evPdSp(ev);
                var indent = getLineIndentations(lines, l, l)[l] + (addIndent ? indentation : 0);
                lines.splice(l + 1, 0, repeat(' ', indent) + text);
                setLines(lines);
                setCursor(lines, {x: indent, y: l + 1});
            }
            else if (ct && mt && (kc === 38 || kc === 40)) {
                //L('move lines', kc === 38 ? 'up' : 'down');
                evPdSp(ev);
                var lines = getLines();
                var c = getCursor();
                var t;
                if (kc === 38 && c.s.y > 0) {
                    t = lines.splice(c.s.y - 1, 1)[0];
                    lines.splice(c.e.y, 0, t);
                    --c.s.y;
                    --c.e.y;
                }
                else if (kc === 40 && c.e.y < lines.length - 1) {
                    t = lines.splice(c.e.y + 1, 1)[0];
                    lines.splice(c.s.y, 0, t);
                    ++c.s.y;
                    ++c.e.y;
                }
                else {
                    return;
                }
                setLines(lines);
                setCursor(lines, c.s, c.e);
            }
        });

        el.addEventListener('keyup', function(ev) {
            var c = getCursor();

            if (statusEl) {
                var v = el.value;
                var words = v.split(/\s/mg).length;
                var lines = v.split('\n').length;
                var chars = v.length;

                statusEl.innerHTML = [
                      'Chars: ', chars,
                    '; Words: ', words,
                    '; Lines: ', lines,
                    '; Pos: ',   c.s.y + 1, ',', c.s.x + 1
                ].join('');
            }
        });

        el.focus();
        return el;
    };

})(this);
