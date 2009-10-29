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

// THIS IS A MAGICAL STRING USED FOR TESTING.

// Tests for the command line interface parts

var file = require("file");
var qunit = require("qunit");

var builder = require("bespin/builder");

qunit.module("bespin/builder/tests/commandTest");

var FAKEPROFILE = new file.Path(module.path).dirname().join("fakeprofile.json");

var throwsBuilderError = function(func, args, message) {
    try {
        func.apply(this, args);
        qunit.ok(false, message);
    } catch (e) {
        if (e instanceof builder.BuilderError) {
            qunit.ok(true, "Got a BuilderError");
        } else {
            qunit.ok(false, "Got an unexpected exception: " + e);
        }
    }
};

qunit.test("Profile loading", function() {
    qunit.ok(FAKEPROFILE.exists(), 
        "Expected the testing profile file to exist (fakeprofile.json)");
    qunit.ok(FAKEPROFILE.isFile(), 
        "Expected to find a file at " + FAKEPROFILE);
    throwsBuilderError(builder.loadProfile, ["BADFILENAME!!!"], 
        "Expected an exception for a bad filename");
    var profile = builder.loadProfile(FAKEPROFILE);
    qunit.equals(profile.length, 1);
    qunit.equals(profile[0].output, "foo");
});

qunit.test("Profile validation", function() {
    throwsBuilderError(builder.validateProfile, [{}], 
        "validate profile expects a list");
    throwsBuilderError(builder.validateProfile, [[{}]], 
        "profiles must have an output defined");
    
    var myProfile = [{output: "foo.js"}];
    builder.validateProfile(myProfile);
    qunit.ok(true, "Should not have encountered an error in the previous validation.");
    qunit.ok(Array.isArray(myProfile[0].includes), 
        "Expected profile to be augmented with includes");
});

qunit.test("Setting up for build", function() {
    var temppath = new file.Path("testtmp");
    if (temppath.exists()) {
        temppath.rmtree();
    }
    builder.generateScript({output: temppath + "/foo.js", includes: []});
    qunit.ok(temppath.exists(), "expected output directory to be created");
    if (temppath.exists()) {
        temppath.rmtree();
    }
});

qunit.test("Get file contents", function() {
    var loader = builder._getLoader();
    
    throwsBuilderError(builder.getFileContents, [loader, {file: "BADFILENAME"}],
        "file contents can only be retrieved for good files");
    file.write("GOODFILENAME", "Just some test data.\n");
    var contents = builder.getFileContents(loader, {file: "GOODFILENAME"});
    qunit.equals(contents, "Just some test data.\n", "File contents not retrieved properly");
    file.remove("GOODFILENAME");
    
    throwsBuilderError(builder.getFileContents, [loader, "non/existent/module"]);
    contents = builder.getFileContents(loader, "bespin/builder/tests/commandTest");
    var fileStart = 'require.register({"bespin/builder/tests/commandTest":{"factory":function(require,exports,module,system,print){';
    qunit.equals(contents.indexOf(fileStart), 0, 
        "File header is missing or incorrect: "
        + contents.substring(0, fileStart.length));
    qunit.ok(contents.indexOf("MAGICAL STRING") > -1, 
        "Could not find MAGICAL STRING in the output");
});

qunit.test("Expand includes", function() {
    var loader = builder._getLoader();
    throwsBuilderError(builder.expandIncludes, [loader, [{moduleDir: "bogus/module"}]],
        "bad module name should result in an error");
    var includes = builder.expandIncludes(loader, [{moduleDir: "bespin/boot"}, "bespin/debug"]);
    qunit.ok(includes.length > 1, "expected many includes");
    var hubFound = false;
    var testsFound = false;
    var debugFound = false;
    
    for (var i = 0; i < includes.length; i++) {
        var filespec = includes[i];
        if (filespec == "bespin/util/hub") {
            hubFound = true;
        } else if (filespec == "bespin/tests/allTests") {
            testsFound = true;
        } else if (filespec == "bespin/debug") {
            debugFound = true;
        }
    }
    qunit.ok(hubFound, "Should have found bespin/util/hub module in the include list");
    qunit.ok(debugFound, "Should have found the debug module, which was included separately");
    qunit.ok(!testsFound, "Tests should not have been included");
});