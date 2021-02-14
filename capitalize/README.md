This example recieves a stream of incoming request bytes, capitalizes them, and
streams them back to the client. To do this it uses a `TransformStream` that
capitalizes chunks from the request body.
