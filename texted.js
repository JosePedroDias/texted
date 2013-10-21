(function(w) {

    var L = function() {
        console.log.apply(console, arguments);
    };

    var repeat = function(s, n) {
        return new Array(n + 1).join(s);
    };

    w.texted = function(el, statusEl) {

        el.spellcheck = false;

        var indentation = 4;

        // unify line endings to unix and tabs to spaces
        var v = el.value;
        v = v.replace('/\r\n/', '\n');
        v = v.replace('/\r/',   '\n');
        v = v.replace('/\t/', repeat(' ', indentation));
        el.value = v;

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
        };

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

        var lines, c;

        el.addEventListener('keydown', function(ev) {
            //L(ev);
            var kc = ev.keyCode;
            var sh = ev.shiftKey;
            var ct = ev.ctrlKey;
            var mt = ev.metaKey; // command in mac
            var al = ev.altKey;
            var wi = ev.keyIdentifier = 'Win'; // windows in linux

            var l;

            if (kc === 9) {
                //L(sh ? 'dedent' : 'indent');
                evPdSp(ev);
                lines = getLines();
                c = getCursor();
                var dt;

                if (c.s.x === c.e.x && c.s.y === c.e.y) {
                    // with empty selection adds/removes indent inline
                    l = c.s.y;
                    if (sh) {
                        var xs = Math.max(c.s.x - indentation, 0);
                        dt = c.s.x - xs;
                        lines[l] = [
                            lines[l].substring(0, xs),
                            lines[l].substring(c.s.x)
                        ].join('');
                        c.s.x -= dt;
                        c.e.x -= dt;
                    }
                    else {
                        lines[l] = [
                            lines[l].substring(0, c.s.x),
                            repeat(' ', indentation),
                            lines[l].substring(c.s.x)
                        ].join('');
                        c.s.x += indentation;
                        c.e.x += indentation;
                    }
                }
                else {
                    // with non-empty selection indents/dedents at start of lines
                    var indents = getLineIndentations(lines, c.s.y, c.e.y);

                    for (var i = c.s.y; i <= c.e.y; ++i) {
                        var ind = indents[i];
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
                }

                setLines(lines);
                setCursor(lines, c.s, c.e);
            }
            else if (kc === 13) {
                lines = getLines();
                c = getCursor();
                l = c.s.y;
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
            else if (ct && (mt||wi) && (kc === 38 || kc === 40)) {
                //L('move lines', kc === 38 ? 'up' : 'down');
                evPdSp(ev);
                lines = getLines();
                c = getCursor();
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
                    '<b>cursor:</b> ', c.s.y + 1, ',', c.s.x + 1, '<br/>',
                    '<b>chars:</b> ', chars,
                    '; <b>words:</b> ', words,
                    '; <b>lines:</b> ', lines
                ].join('');
            }
        });

        el.focus();
        return el;
    };

})(this);
