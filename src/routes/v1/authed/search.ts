import { FastifyInstance, FastifyRequest } from "fastify";
import { ISearch, TSearch } from "../../../types.js";

const search = async (fastify: FastifyInstance, options: Object) => {
  const allowedCollections = ["recipes"];

  fastify.get(
    "/",
    {
      schema: {
        querystring: TSearch,
      },
    },
    async (request: FastifyRequest<{ Querystring: ISearch }>, reply) => {
      const { q, c, p, f } = request.query;

      if (!allowedCollections.includes(c)) {
        reply.code(400);
        throw new Error(`Invalid collection ${c}`);
      }

      let filterBy = "";
      if (f) {
        filterBy += ` && ${f}`;
      }

      let results: any = {};
      try {
        results = await fastify.typesense
          .collections(c)
          .documents()
          .search({
            q,
            query_by: "title",
            // filter_by: `createdByUuid:${request.user?.uuid} && categories:=Main && categories:=Starter && tags:=Easy`,
            filter_by: `createdByUuid:${request.user?.uuid}${filterBy}`,
            facet_by: "categories,tags",
            page: p,
            per_page: 10,
          });
      } catch (e) {
        fastify.log.error(e);
        throw new Error("Error searching");
      }

      return results;
    }
  );
};

export default search;
