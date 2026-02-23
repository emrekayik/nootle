/// <reference path="../pb_data/types.d.ts" />
migrate((app) => {
  const collection = app.findCollectionByNameOrId("pbc_3395098727")

  // update collection data
  unmarshal({
    "viewRule": "user = @request.auth.id || @collection.permissions.record_id ?= id && @collection.permissions.user = @request.auth.id"
  }, collection)

  return app.save(collection)
}, (app) => {
  const collection = app.findCollectionByNameOrId("pbc_3395098727")

  // update collection data
  unmarshal({
    "viewRule": "user = @request.auth.id"
  }, collection)

  return app.save(collection)
})
