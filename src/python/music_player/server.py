#!/usr/bin/env python

import cherrypy
import os

from mako.lookup import TemplateLookup

from music_player.apigateway import ApiGateway

class Root(ApiGateway):

    def __init__(self, show_debugger):
        super(Root, self).__init__()

        self.show_debugger = show_debugger
        templateDir = os.path.join(cherrypy.Application.wwwDir, 'templates')
        cherrypy.log("Template Dir: %s" % templateDir)
        self.templateLookup = TemplateLookup(directories=templateDir)

    # no authorization needed for the landing page
    @cherrypy.expose
    def index(self):
        """
        This will redirect users to the proper view

        :return:
        """

        # template = self.templateLookup.get_template("app.html")
        # template = self.templateLookup.get_template("login.html")
        # ret = template.render()
        # return ret
        user = cherrypy.session.get("name", None)
        if user is None:
            print("no user, redirecting")
            # template = self.templateLookup.get_template("login.html")
            raise cherrypy.HTTPRedirect("/login")
        else:
            print("user present, redirecting")
            raise cherrypy.HTTPRedirect("/app")
            # template = self.templateLookup.get_template("app.html")
        # return template.render()

    @cherrypy.expose
    def login(self):
        """
        Return the login page
        """
        user = cherrypy.session.get("name", None)
        if user is not None:
            print("login redirect to app")
            raise cherrypy.HTTPRedirect("/")
        print("render login")
        template = self.templateLookup.get_template("login.html")
        return template.render()

    @cherrypy.expose
    def app(self):
        """
        Return the application page
        """
        # user = cherrypy.session.get("name", None)
        # if user is not None:
        #     print("app redirect")
        #     raise cherrypy.HTTPRedirect("/")
        print("render app")
        return self.templateLookup.get_template("app.html").render()
        '''
        role = cherrypy.session.get('role', None)
        if role is None:
            raise cherrypy.HTTPRedirect('/login')
        elif role == 'student':
            raise cherrypy.HTTPRedirect('/student')
        elif role == 'manager':
            raise cherrypy.HTTPRedirect('/manager')
        elif role == 'admin':
            raise cherrypy.HTTPRedirect('/admin')
        else:
            cherrypy.log("Invalid user role at index. Role: %s" % role)
            raise cherrypy.HTTPError(400, 'Invalid user role')

    # no authorization needed for the login page
    @cherrypy.expose
    def login(self):
        """
        Return the login page / login view.
        """

        role = cherrypy.session.get('role', None)
        if role is not None:
            raise cherrypy.HTTPRedirect('/')

        template = self.templateLookup.get_template('login/LoginApp.html')
        ret = template.render()
        cherrypy.log(str(type(ret)))
        return ret

    # no authorization needed for the verify page
    @cherrypy.expose
    def verify(self, id):
        """
        This is the account setup page. Here, a user can set their password
        for the first time.
        """

        # TODO check for and alert for expired invitations
        template = self.templateLookup.get_template('verify/VerifyApp.html')
        ret = template.render(verifyUUID=id)
        cherrypy.log(str(type(ret)))
        return ret

    @cherrypy.expose
    @authorizedRoles("student", redirect=True)
    def student(self):
        """
        Return the student view.
        """
        template = self.templateLookup.get_template('student/StudentApp.html')
        ret = template.render()
        return ret
    '''
    # no authorization needed, because this should be removed in production
    @cherrypy.expose
    def debug(self):
        """
        Debugging view. Allows random rest endpoints to be tested.
        TODO Disable this interface in production
        """
        if not self.show_debugger:
            raise cherrypy.HTTPError(404)

        template = self.templateLookup.get_template('debug/DebugApp.html')
        ret = template.render()
        cherrypy.log(str(type(ret)))
        return ret
