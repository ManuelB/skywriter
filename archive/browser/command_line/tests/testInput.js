require.def(['require', 'exports', 'module',
    'skywriter/promise',
    'keyboard/keyboard',
    'command_line/input',
    'command_line/tests/plugindev'
], function(require, exports, module,
    promise,
    keyboard,
    input,
    t
) {

/* ***** BEGIN LICENSE BLOCK *****
 * Version: MPL 1.1/GPL 2.0/LGPL 2.1
 *
 * The contents of this file are subject to the Mozilla Public License Version
 * 1.1 (the "License"); you may not use this file except in compliance with
 * the License. You may obtain a copy of the License at
 * http://www.mozilla.org/MPL/
 *
 * Software distributed under the License is distributed on an "AS IS" basis,
 * WITHOUT WARRANTY OF ANY KIND, either express or implied. See the License
 * for the specific language governing rights and limitations under the
 * License.
 *
 * The Original Code is Skywriter.
 *
 * The Initial Developer of the Original Code is
 * Mozilla.
 * Portions created by the Initial Developer are Copyright (C) 2009
 * the Initial Developer. All Rights Reserved.
 *
 * Contributor(s):
 *   Skywriter Team (skywriter@mozilla.com)
 *
 * Alternatively, the contents of this file may be used under the terms of
 * either the GNU General Public License Version 2 or later (the "GPL"), or
 * the GNU Lesser General Public License Version 2.1 or later (the "LGPL"),
 * in which case the provisions of the GPL or the LGPL are applicable instead
 * of those above. If you wish to allow use of your version of this file only
 * under the terms of either the GPL or the LGPL, and not to allow others to
 * use your version of this file under the terms of the MPL, indicate your
 * decision by deleting the provisions above and replace them with the notice
 * and other provisions required by the GPL or the LGPL. If you do not delete
 * the provisions above, a recipient may use your version of this file under
 * the terms of any one of the MPL, the GPL or the LGPL.
 *
 * ***** END LICENSE BLOCK ***** */

var Promise = promise.Promise;



var Input = input.Input;


function parse(command) {
    var promise = new Promise();

    new Input(command).argsPromise.then(function(args) {
        promise.resolve({
            args: args,
            input: command
        });
    }, t.never());

    return promise;
}

exports.testInput = function() {
    parse('set maxConsoleHeight 300').then(function(data) {
        console.log('data', data);
        t.deepEquals(data.args, {}, '');
    });
};

/*
 *
 */

({
    "description": "blah blah",
    "provides":
    [
        {
            "ep": "command",
            "name": "tst",
            "description": "Test Command"
        },
        {
            "ep": "command",
            "name": "tst list",
            "params":
            [
                {
                    "name": "first",
                    "type": "text",
                    "description": "First param"
                }
            ],
            "description": "Tst List",
            "pointer": "test/testcommands#tstList"
        },
        {
            "ep": "command",
            "name": "tst add",
            "params":
            [
                {
                    "name": "first",
                    "type": "text",
                    "description": "First param"
                },
                {
                    "name": "second",
                    "type": { "name": "selection", "data": [ "aa", "bb" ] },
                    "description": "Second param"
                },
                {
                    "name": "third",
                    "type": "number",
                    "description": "Third param",
                    "defaultValue": 42
                },
                {
                    "name": "fourth",
                    "type": "boolean",
                    "description": "Fourth param",
                    "defaultValue": true
                }
            ],
            "description": "Tst Add",
            "pointer": "test/testcommands#tstAdd"
        },
        {
            "ep": "command",
            "name": "tst remove",
            "params": [],
            "description": "Tst Remove",
            "pointer": "test/testcommands#tstRemove"
        }
    ]
});

});
