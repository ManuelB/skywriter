/* ***** BEGIN LICENSE BLOCK *****
 * Version: MPL 1.1
 *
 * The contents of this file are subject to the Mozilla Public License
 * Version 1.1 (the "License"); you may not use this file except in
 * compliance with the License. You may obtain a copy of the License at
 * http://www.mozilla.org/MPL/
 *
 * Software distributed under the License is distributed on an "AS IS"
 * basis, WITHOUT WARRANTY OF ANY KIND, either express or implied.
 * See the License for the specific language governing rights and
 * limitations under the License.
 *
 * The Original Code is Bespin.
 *
 * The Initial Developer of the Original Code is Mozilla.
 * Portions created by the Initial Developer are Copyright (C) 2009
 * the Initial Developer. All Rights Reserved.
 *
 * Contributor(s):
 *   Bespin Team (bespin@mozilla.com)
 *
 * ***** END LICENSE BLOCK ***** */

"define metadata";
({
    "provides": [ {
        "ep": "command",
        "name": "editconfig",
        "aliases": [ "config" ],
        "preview": "load up the config file",
        "pointer": "config#editconfigCommand"
    }, {
        "ep": "command",
        "name": "runconfig",
        "preview": "run your config file",
        "pointer": "config#runconfigCommand"
    }, {
        "ep": "command",
        "name": "bindkey",
        "takes": [ "modifiers", "key", "action" ],
        "aliases": [ "" ],
        "preview": "Bind a key to an action, or show bindings",
        "completeText": "With no arguments show bindings, else give modifier(s), key, and action name to set",
        "usage": "",
        "pointer": "config#bindkeyCommand"
    }, {
        "ep": "command",
        "name": "alias",
        "takes": [ "alias", "command" ],
        "aliases": [ "" ],
        "preview": "define and show aliases for commands",
        "completeText": "optionally, add your alias name, and then the command name",
        "usage": "",
        "pointer": "config#aliasCommand"
    }, {
        "ep": "command",
        "name": "history",
        "preview": "Show history of the commands",
        "pointer": "config#historyCommand"
    }, {
        "ep": "command",
        "name": "set",
        "takes": [ "key", "value" ],
        "preview": "define and show settings",
        "pointer": "config#setCommand",
        "completionPointer": "config#setCompleter"
    }, {
        "ep": "command",
        "name": "unset",
        "takes": [ "key" ],
        "aliases": [ "" ],
        "preview": "unset a setting entirely",
        "completeText": "add a key for the setting to delete entirely",
        "pointer": "config#unsetCommand",
        "completionPointer": "config#unsetCompleter"
    } ]
});
"end";

var command = require("bespin/command");
var keys = require("bespin/util/keys");
var plugins = require("plugins");

var files = plugins.catalog.getObject("files");
var editor = plugins.catalog.getObject("editor");
var settings = plugins.catalog.getObject("settings");

/**
 * 'editconfig' command
 */
exports.editconfigCommand = function(instruction) {
    editor.openFile(files.userSettingsProject, "config");
};

/**
 * 'runconfig' command
 */
exports.runconfigCommand = function(instruction) {
    files.evalFile(files.userSettingsProject, "config");
};

/**
 * 'bindkey' command
 */
exports.bindkeyCommand = function(instruction, args) {
    if (args.key && args.action) { // bind a new key binding
        if (args.modifiers == "none") {
            args.modifiers = '';
        }
        editor.bindKey(args.action, args.modifiers + ' ' + args.key, args.selectable);
    } else { // show me the key bindings
        var descriptions = editor.editorKeyListener.keyMapDescriptions;
        var output = "<table>";

        for (var keys in descriptions) {
            if (descriptions.hasOwnProperty(keys)) {
                var keyData = keys.split(','); // metaKey, ctrlKey, altKey, shiftKey
                var keyCode = parseInt(keyData[0], 10);

                var modifiers = [];
                if (keyData[1] === "true") {
                    modifiers.push("CMD");
                }
                if (keyData[2] === "true") {
                    modifiers.push("CTRL");
                }
                if (keyData[3] === "true") {
                    modifiers.push("ALT");
                }
                if (keyData[4] === "true") {
                    modifiers.push("SHIFT");
                }

                var modifierInfo = modifiers.length > 0 ? modifiers.join(', ') + " " : "";
                var keyInfo = modifierInfo + keys.KeyCodeToName[keyCode] || keyCode;
                output += "<tr><td style='text-align:right;'>" + keyInfo + "</td> " +
                        "<td>&#x2192;</td><td>" + descriptions[keys] + "</td></tr>";
            }
        }
        output += "</table>";
        instruction.addOutput(output);
    }
};

/**
 * 'alias' command
 */
exports.aliasCommand = function(instruction, args) {
    var aliases = command.rootCanon.aliases;

    if (!args.alias) {
        // * show all
        var output = "<table>";
        for (var x in aliases) {
            if (aliases.hasOwnProperty(x)) {
                output += "<tr><td style='text-align:right;'>" + x + "</td>" +
                        "<td>&#x2192;</td><td>" + aliases[x] + "</td></tr>";
            }
        }
        output += "</table>";
        instruction.addOutput(output);
    } else {
        // * show just one
        if (args.command === undefined) {
          var alias = aliases[args.alias];
          if (alias) {
              instruction.addOutput(args.alias + " &#x2192; " + aliases[args.alias]);
          } else {
              instruction.addErrorOutput("No alias set for '" + args.alias + "'");
          }
        } else {
            // * save a new alias
            var key = args.alias;
            var value = args.command;
            var aliascmd = value.split(' ')[0];

            if (command.rootCanon.commands[key]) {
                instruction.addErrorOutput("Sorry, there is already a command with the name: " + key);
            } else if (command.rootCanon.commands[aliascmd]) {
                aliases[key] = value;
                instruction.addOutput("Saving alias: " + key + " &#x2192; " + value);
            } else if (aliases[aliascmd]) {
                // TODO: have the symlink to the alias not the end point
                aliases[key] = value;
                instruction.addOutput("Saving alias: " + key + " &#x2192; " + aliases[value] + " (" + value + " was an alias itself)");
            } else {
                instruction.addErrorOutput("Sorry, no command or alias with that name.");
            }
        }
    }
};

/**
 * 'history' command
 */
exports.historyCommand = function(instruction) {
    var instructions = command.history.getInstructions();
    var output = [];
    output.push("<table>");
    var count = 1;
    instructions.forEach(function(instruction) {
        output.push("<tr>");
        output.push('<th>' + count + '</th>');
        output.push('<td>' + instruction.typed + "</td>");
        output.push("</tr>");
        count++;
    });
    output.push("</table>");

    instruction.addOutput(output.join(''));
};

/**
 * 'set' command
 */
exports.setCommand = function(instruction, setting) {
    var output;

    if (!setting.key) {
        var settings = settings.list();
        output = "";
        // first sort the settings based on the key
        settings.sort(function(a, b) {
            if (a.key < b.key) {
                return -1;
            } else if (a.key == b.key) {
                return 0;
            } else {
                return 1;
            }
        });
        // now add to output unless hidden settings (start with a _)
        settings.forEach(function(setting) {
            if (setting.key[0] != '_') {
                output += "<a class='setting' href='https://wiki.mozilla.org/Labs/Bespin/Settings#" + setting.key + "' title='View external documentation on setting: " + setting.key + "' target='_blank'>" + setting.key + "</a> = " + setting.value + "<br/>";
            }
        });
    } else {
        var key = setting.key;
        if (setting.value === undefined) { // show it
            var value = settings.values[key];
            if (value) {
                output = "<strong>" + key + "</strong> = " + value;
            } else {
                output = "You do not have a setting for '" + key + "'";
            }
        } else {
            output = "Saving setting: <strong>" + key + "</strong> = " + setting.value;
            settings.values[key] = setting.value;
        }
    }
    instruction.addOutput(output);
};

/**
 * Auto-completion for 'set'
 */
exports.setCompleter = function(query, callback) {
    var key = query.action[0];
    var val = settings.getValue(key);

    if (query.action.length == 1) {
        // Check if this is an exact match
        if (val) {
            query.hint = "Current value of " + key + " is '" + val + "'. Enter a new value, or press enter to display in the console.";
            callback(query);
            return;
        }

        // So no exact matches, we're looking for options
        var list = settings.list().map(function(entry) {
            return entry.key;
        });
        var matches = this.parent.filterOptionsByPrefix(list, key);

        if (matches.length == 1) {
            // Single match: go for autofill and hint
            query.autofill = "set " + matches[0];
            val = settings.getValue(matches[0]);
            query.hint = "Current value of " + matches[0] + " is '" + val + "'. Enter a new value, or press enter to display in the console.";
        } else if (matches.length === 0) {
            // No matches, cause an error
            query.error = "No matching settings";
        } else {
            // Multiple matches, present a list
            matches.sort(function(a, b) {
                return a.localeCompare(b);
            });
            query.options = matches;
        }

        callback(query);
        return;
    }

    if (val) {
        query.hint = "Current value of " + key + " is '" + val + "'. Enter a new value, or press enter to display in the console.";
        callback(query);
        return;
    }

    query.error = "No setting for '" + key + "'";
    callback(query);
    return;
};

/**
 * 'unset' command
 */
exports.unsetCommand = function(instruction, key) {
    if (!settings.values[key]) {
        instruction.addErrorOutput("No setting for " + key + ".");
    } else {
        settings.resetValue(key);
        instruction.addOutput("Unset the setting for " + key + ".");
    }
};

/**
 * Auto-completion for 'unset'
 */
exports.unsetCompleter = function(query, callback) {
    var key = query.action[0];
    var val = settings.values[key];

    // Multiple params are an error
    if (query.action.length > 1) {
        query.error = "Can only unset one setting at a time";
        callback(query);
        return;
    }

    // Exact match
    if (val) {
        query.hint = "Current value of " + key + " is '" + val + "'. Press enter to remove the setting.";
        callback(query);
        return;
    }

    // So no exact matches, we're looking for options
    var list = settings.list().map(function(entry) {
        return entry.key;
    });
    var matches = this.parent.filterOptionsByPrefix(list, key);

    if (matches.length == 1) {
        // Single match: go for autofill and hint
        query.autofill = "set " + matches[0];
        val = settings.getValue(matches[0]);
        query.hint = "Current value of " + matches[0] + " is '" + val + "'. Press enter to remove the setting.";
    } else if (matches.length === 0) {
        // No matches, cause an error
        query.error = "No matching settings";
    } else {
        // Multiple matches, present a list
        matches.sort(function(a, b) {
            return a.localeCompare(b);
        });
        query.options = matches;
    }

    callback(query);
    return;
};