#!/usr/bin/env python3

import cherrypy, os

from music_player.server import Root

def main():
    #configure the cherrypy server
    cherrypy.Application.wwwDir = os.path.join(os.path.dirname(os.path.realpath(__file__)),
        os.path.join('..', '..', 'www'))

    # cherrypy.Application.downloadDir = os.path.join(os.path.dirname(os.path.realpath(__file__)),
    #     os.path.join('..', 'download'))

    server_config = os.path.abspath(os.path.join(
        os.path.dirname(os.path.realpath(__file__)),
        '..', '..', 'etc', 'server.conf'))

    #cherrypy.config.update({"engine.autoreload_on": True})
    cherrypy.config.update(server_config)
    cherrypy.tree.mount(
        Root(show_debugger=True),
        '/',
        config=server_config)

    # cherrypy.server.socket_host = '0.0.0.0'
    cherrypy.engine.start()
    cherrypy.engine.block()
    '''
    # so windows users can exit gracefully
    windows = not os.path.exists('./.notwindows')

    if windows:
        input()
        cherrypy.engine.stop()
    else: #linux
        cherrypy.engine.block()
    '''
if __name__ == '__main__':
    main()
